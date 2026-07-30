from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any


REPO = Path(__file__).resolve().parents[1]
PROJECTS = REPO.parents[1]
CONFIG_PATH = Path(__file__).with_name("pipeline.json")
EXPERIMENTS = REPO / ".experiments" / "ai3d"


def config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def project_path(relative: str) -> Path:
    return PROJECTS / relative


def ensure_directories() -> None:
    for name in ("sources", "inputs", "raw", "repaired", "logs", "manifests"):
        (EXPERIMENTS / name).mkdir(parents=True, exist_ok=True)


def write_manifest(name: str, payload: dict[str, Any]) -> Path:
    ensure_directories()
    target = EXPERIMENTS / "manifests" / f"{name}.json"
    target.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return target


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
