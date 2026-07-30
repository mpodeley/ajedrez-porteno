from __future__ import annotations

import argparse
import os
import subprocess
import sys

from common import EXPERIMENTS, config, ensure_directories, project_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Inicia ComfyUI con ROCm para el laboratorio 3D.")
    parser.add_argument("--listen", default=None, help="Usar 0.0.0.0 para abrirlo en la red local.")
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--cpu-vae", action="store_true")
    args = parser.parse_args()

    cfg = config()["lab"]
    comfy = project_path(cfg["comfyui"])
    ensure_directories()
    host = args.listen or cfg["host"]
    port = args.port or cfg["port"]
    command = [
        sys.executable,
        "main.py",
        "--listen",
        host,
        "--port",
        str(port),
        "--output-directory",
        str(EXPERIMENTS / "raw"),
        "--input-directory",
        str(EXPERIMENTS / "inputs"),
    ]
    if args.cpu_vae:
        command.append("--cpu-vae")
    env = os.environ.copy()
    env.setdefault("PYTORCH_HIP_ALLOC_CONF", "expandable_segments:True")
    print(f"ComfyUI: http://{host}:{port}")
    print("Salidas:", EXPERIMENTS / "raw")
    return subprocess.call(command, cwd=comfy, env=env)


if __name__ == "__main__":
    raise SystemExit(main())
