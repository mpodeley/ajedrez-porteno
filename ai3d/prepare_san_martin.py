from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps
from rembg import new_session, remove

from common import EXPERIMENTS, ensure_directories, write_manifest


SELECTION = {
    "front": {"page_id": 26692467, "file": "26692467.JPG", "crop": (690, 15, 1205, 730)},
    "left": {"page_id": 6031272, "file": "6031272.jpg", "crop": (430, 40, 1480, 1160)},
    "right": {"page_id": 17118330, "file": "17118330.jpg", "crop": (785, 320, 1515, 1090)},
}


def centered_white(subject: Image.Image, size: int = 1024, margin: int = 72) -> Image.Image:
    rgba = subject.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 18 else 0).getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    scale = min((size - margin * 2) / rgba.width, (size - margin * 2) / rgba.height)
    rgba = rgba.resize((max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    position = ((size - rgba.width) // 2, (size - rgba.height) // 2)
    canvas.alpha_composite(rgba, position)
    return canvas.convert("RGB")


def main() -> int:
    parser = argparse.ArgumentParser(description="Recorta y aísla tres vistas permitidas del monumento a San Martín.")
    parser.add_argument("--model", default="u2net", choices=("u2net", "isnet-general-use"))
    args = parser.parse_args()
    ensure_directories()
    source_dir = EXPERIMENTS / "sources" / "san-martin"
    output_dir = EXPERIMENTS / "views" / "san-martin"
    output_dir.mkdir(parents=True, exist_ok=True)
    source_manifest_path = EXPERIMENTS / "manifests" / "sources.json"
    if not source_manifest_path.exists():
        raise SystemExit("Primero ejecutá `npm run ai3d:fetch -- san-martin`.")
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    entries = {
        item["page_id"]: item
        for item in source_manifest.get("san_martin", {}).get("images", [])
    }

    session = new_session(args.model)
    selected = []
    for view, settings in SELECTION.items():
        source = source_dir / settings["file"]
        if not source.exists():
            raise FileNotFoundError(source)
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        crop = image.crop(settings["crop"])
        crop = ImageEnhance.Contrast(crop).enhance(1.08)
        isolated = remove(crop, session=session, alpha_matting=False)
        prepared = centered_white(isolated)
        target = output_dir / f"{view}.png"
        prepared.save(target, optimize=True)
        selected.append(
            {
                "view": view,
                "page_id": settings["page_id"],
                "crop": settings["crop"],
                "output": str(target),
                "source": entries.get(settings["page_id"]),
            }
        )
        print(view, "→", target)

    contact = Image.new("RGB", (1024 * len(selected), 1024), "white")
    for index, item in enumerate(selected):
        contact.paste(Image.open(item["output"]).convert("RGB"), (1024 * index, 0))
    contact_path = output_dir / "contact-sheet.jpg"
    contact.resize((512 * len(selected), 512), Image.Resampling.LANCZOS).save(contact_path, quality=90)
    manifest = write_manifest("san-martin-views", {"model": args.model, "views": selected})
    print("Contacto:", contact_path)
    print("Manifiesto:", manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
