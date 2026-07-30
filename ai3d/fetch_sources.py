from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import time
import urllib.parse
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from common import EXPERIMENTS, config, ensure_directories, write_manifest


USER_AGENT = "AjedrezPorteno/1.0 (research; GitHub mpodeley/ajedrez-porteno)"


def download(url: str, target: Path) -> None:
    for attempt in range(5):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=60) as response, target.open("wb") as output:
                shutil.copyfileobj(response, output)
            return
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def fetch_cabildo() -> dict[str, Any]:
    source = config()["sources"]["cabildo_lidar"]
    folder = EXPERIMENTS / "sources" / "cabildo"
    folder.mkdir(parents=True, exist_ok=True)
    archive = folder / "cabildo.zip"
    if not archive.exists():
        print("Descargando LiDAR oficial del Cabildo…")
        download(source["url"], archive)
    extracted = folder / "extracted"
    extracted.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as package:
        package.extractall(extracted)
        names = package.namelist()
    return {
        **source,
        "archive": str(archive),
        "sha256": digest(archive),
        "bytes": archive.stat().st_size,
        "files": names,
    }


def commons_query(params: dict[str, str]) -> dict[str, Any]:
    api = config()["sources"]["san_martin_commons"]["api"]
    url = f"{api}?{urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': '2'})}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def fetch_san_martin() -> dict[str, Any]:
    source = config()["sources"]["san_martin_commons"]
    folder = EXPERIMENTS / "sources" / "san-martin"
    folder.mkdir(parents=True, exist_ok=True)
    data = commons_query(
        {
            "action": "query",
            "generator": "categorymembers",
            "gcmtitle": source["category"],
            "gcmtype": "file",
            "gcmlimit": "24",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": "1600",
        }
    )
    images = []
    for page in data.get("query", {}).get("pages", []):
        info = page.get("imageinfo", [{}])[0]
        metadata = info.get("extmetadata", {})
        thumb = info.get("thumburl") or info.get("url")
        if not thumb:
            continue
        extension = Path(urllib.parse.urlparse(thumb).path).suffix or ".jpg"
        target = folder / f"{page['pageid']}{extension}"
        if not target.exists():
            download(thumb, target)
            time.sleep(1.1)
        images.append(
            {
                "title": page["title"],
                "page_id": page["pageid"],
                "file": str(target),
                "description_url": info.get("descriptionurl"),
                "license": metadata.get("LicenseShortName", {}).get("value"),
                "artist": metadata.get("Artist", {}).get("value"),
                "credit": metadata.get("Credit", {}).get("value"),
                "sha256": digest(target),
            }
        )
    if not images:
        raise RuntimeError("Wikimedia Commons no devolvió imágenes para la categoría configurada")
    return {**source, "images": images}


def main() -> int:
    parser = argparse.ArgumentParser(description="Descarga las fuentes permitidas y conserva su atribución.")
    parser.add_argument("source", choices=("cabildo", "san-martin", "all"), nargs="?", default="all")
    args = parser.parse_args()
    ensure_directories()
    manifest_path = EXPERIMENTS / "manifests" / "sources.json"
    payload: dict[str, Any] = (
        json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest_path.exists()
        else {}
    )
    if args.source in ("cabildo", "all"):
        payload["cabildo"] = fetch_cabildo()
    if args.source in ("san-martin", "all"):
        payload["san_martin"] = fetch_san_martin()
    manifest = write_manifest("sources", payload)
    print("Manifiesto:", manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
