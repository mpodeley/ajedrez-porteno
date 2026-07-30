from __future__ import annotations

import os
import platform
import shutil
import sys
from pathlib import Path

from common import config, project_path


def result(ok: bool, label: str, detail: str) -> bool:
    mark = "OK" if ok else "FALTA"
    print(f"[{mark:5}] {label}: {detail}")
    return ok


def main() -> int:
    cfg = config()["lab"]
    comfy = project_path(cfg["comfyui"])
    checkpoints = comfy / "models" / "checkpoints"
    checks: list[bool] = []

    checks.append(result(sys.version_info >= (3, 12), "Python", platform.python_version()))
    checks.append(result(comfy.is_dir(), "ComfyUI", str(comfy)))
    checks.append(result(Path("/dev/kfd").exists(), "ROCm /dev/kfd", "/dev/kfd"))
    checks.append(result(os.access("/dev/kfd", os.R_OK | os.W_OK), "Permisos GPU", "lectura/escritura"))

    try:
        import torch

        available = torch.cuda.is_available()
        device = torch.cuda.get_device_name(0) if available else "no disponible"
        checks.append(result(available, "PyTorch ROCm", f"{torch.__version__} · {device}"))
        if available:
            capability = torch.cuda.get_device_capability(0)
            architecture = "gfx1151" if capability == (11, 5) else f"capability {capability}"
            checks.append(result(capability == (11, 5), "Arquitectura", architecture))
    except Exception as exc:
        checks.append(result(False, "PyTorch ROCm", str(exc)))

    for key in ("checkpoint", "single_view_checkpoint"):
        path = checkpoints / cfg[key]
        detail = f"{path.name} · {path.stat().st_size / 1024**3:.2f} GiB" if path.exists() else path.name
        checks.append(result(path.exists() and path.stat().st_size > 1_000_000_000, key, detail))

    for module in ("open3d", "laspy", "trimesh", "manifold3d", "rembg"):
        try:
            __import__(module)
            checks.append(result(True, f"Módulo {module}", "instalado"))
        except Exception as exc:
            checks.append(result(False, f"Módulo {module}", str(exc).splitlines()[0]))

    checks.append(result(shutil.which("curl") is not None, "curl", shutil.which("curl") or ""))
    print(f"\nEntorno: {Path(sys.executable)}")
    return 0 if all(checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
