from __future__ import annotations

import argparse
import json
import shutil
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from common import EXPERIMENTS, config, ensure_directories, project_path, sha256, write_manifest


VIEWS = ("front", "left", "back", "right")


def request_json(url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data)
    if data is not None:
        request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read())


def workflow(images: dict[str, str], seed: int, prefix: str) -> dict[str, Any]:
    cfg = config()
    lab = cfg["lab"]
    gen = cfg["generation"]
    prompt: dict[str, Any] = {
        "1": {"class_type": "ImageOnlyCheckpointLoader", "inputs": {"ckpt_name": lab["checkpoint"]}},
        "2": {
            "class_type": "EmptyLatentHunyuan3Dv2",
            "inputs": {"resolution": gen["latent_resolution"], "batch_size": 1},
        },
        "3": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"model": ["1", 0], "shift": 1.0},
        },
    }
    encoded: dict[str, list[Any]] = {}
    next_id = 10
    for view in VIEWS:
        if view not in images:
            continue
        load_id = str(next_id)
        encode_id = str(next_id + 1)
        prompt[load_id] = {"class_type": "LoadImage", "inputs": {"image": images[view]}}
        prompt[encode_id] = {
            "class_type": "CLIPVisionEncode",
            "inputs": {"clip_vision": ["1", 1], "image": [load_id, 0], "crop": "none"},
        }
        encoded[view] = [encode_id, 0]
        next_id += 2
    prompt.update(
        {
            "20": {
                "class_type": "Hunyuan3Dv2ConditioningMultiView",
                "inputs": encoded,
            },
            "21": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["3", 0],
                    "positive": ["20", 0],
                    "negative": ["20", 1],
                    "latent_image": ["2", 0],
                    "seed": seed,
                    "steps": gen["steps"],
                    "cfg": gen["cfg"],
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                },
            },
            "22": {
                "class_type": "VAEDecodeHunyuan3D",
                "inputs": {
                    "samples": ["21", 0],
                    "vae": ["1", 2],
                    "num_chunks": 8000,
                    "octree_resolution": gen["octree_resolution"],
                },
            },
            "23": {
                "class_type": "VoxelToMesh",
                "inputs": {
                    "voxel": ["22", 0],
                    "algorithm": "surface net",
                    "threshold": gen["threshold"],
                },
            },
            "24": {
                "class_type": "SaveGLB",
                "inputs": {"mesh": ["23", 0], "filename_prefix": prefix},
            },
        }
    )
    return prompt


def stage_images(input_dir: Path, run_name: str, require_four: bool) -> dict[str, str]:
    staged: dict[str, str] = {}
    for view in VIEWS:
        candidates = [input_dir / f"{view}{extension}" for extension in (".png", ".jpg", ".jpeg", ".webp")]
        source = next((path for path in candidates if path.exists()), None)
        if source is None:
            if require_four or view == "front":
                raise FileNotFoundError(f"Falta {view}.png/jpg/webp en {input_dir}")
            continue
        filename = f"{run_name}-{view}{source.suffix.lower()}"
        shutil.copy2(source, EXPERIMENTS / "inputs" / filename)
        staged[view] = filename
    if len(staged) < 2:
        raise ValueError("Hacen falta al menos la vista frontal y otra vista.")
    return staged


def wait_for_output(base_url: str, prompt_id: str, timeout: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        history = request_json(f"{base_url}/history/{prompt_id}")
        if prompt_id in history:
            item = history[prompt_id]
            status = item.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status, indent=2))
            if status.get("completed"):
                return item
        time.sleep(3)
    raise TimeoutError(f"ComfyUI no terminó en {timeout} segundos")


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera cuatro candidatos Hunyuan3D multivista.")
    parser.add_argument("--piece", default="caballo", choices=("caballo", "rey"))
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, action="append", dest="seeds")
    parser.add_argument("--timeout", type=int, default=3600)
    parser.add_argument("--require-four", action="store_true")
    args = parser.parse_args()

    cfg = config()
    ensure_directories()
    base_url = f"http://{cfg['lab']['host']}:{cfg['lab']['port']}"
    try:
        request_json(f"{base_url}/system_stats")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SystemExit(f"ComfyUI no responde en {base_url}. Ejecutá `npm run ai3d:comfy`. ({exc})")

    seeds = args.seeds or cfg["generation"]["seeds"]
    manifest_path = EXPERIMENTS / "manifests" / f"{args.piece}-hunyuan.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"runs": []}
    checkpoint = (
        project_path(cfg["lab"]["comfyui"])
        / "models"
        / "checkpoints"
        / cfg["lab"]["checkpoint"]
    )
    input_files = {
        view: next(
            (
                path
                for extension in (".png", ".jpg", ".jpeg", ".webp")
                if (path := args.input_dir / f"{view}{extension}").exists()
            ),
            None,
        )
        for view in VIEWS
    }
    manifest.update(
        {
            "piece": args.piece,
            "inputs": str(args.input_dir.resolve()),
            "input_sha256": {
                view: sha256(path) for view, path in input_files.items() if path is not None
            },
            "checkpoint": {
                "file": checkpoint.name,
                "bytes": checkpoint.stat().st_size,
                "sha256": sha256(checkpoint),
            },
            "generation": cfg["generation"],
        }
    )
    for seed in seeds:
        run_name = f"{args.piece}-{seed}-{uuid.uuid4().hex[:8]}"
        images = stage_images(args.input_dir, run_name, args.require_four)
        prefix = f"{args.piece}/{args.piece}-hunyuan-seed-{seed}"
        response = request_json(
            f"{base_url}/prompt",
            {"prompt": workflow(images, seed, prefix), "client_id": uuid.uuid4().hex},
        )
        prompt_id = response["prompt_id"]
        print(f"Seed {seed}: cola {prompt_id}")
        history = wait_for_output(base_url, prompt_id, args.timeout)
        outputs = history.get("outputs", {}).get("24", {})
        manifest["runs"] = [run for run in manifest["runs"] if run.get("seed") != seed]
        manifest["runs"].append({"seed": seed, "prompt_id": prompt_id, "outputs": outputs})
        manifest["runs"].sort(key=lambda run: run["seed"])
        print(f"Seed {seed}: terminado")
    path = write_manifest(f"{args.piece}-hunyuan", manifest)
    print("Manifiesto:", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
