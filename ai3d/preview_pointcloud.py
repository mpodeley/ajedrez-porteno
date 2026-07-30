from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import open3d as o3d

from common import EXPERIMENTS


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera proyecciones de diagnóstico de una nube de puntos.")
    parser.add_argument(
        "cloud",
        type=Path,
        nargs="?",
        default=EXPERIMENTS / "sources" / "cabildo" / "cabildo-centered.ply",
    )
    parser.add_argument("--output", type=Path, default=EXPERIMENTS / "sources" / "cabildo" / "preview.png")
    parser.add_argument("--points", type=int, default=350_000)
    args = parser.parse_args()
    cloud = o3d.io.read_point_cloud(str(args.cloud))
    points = np.asarray(cloud.points)
    colors = np.asarray(cloud.colors)
    if len(points) > args.points:
        rng = np.random.default_rng(2026)
        selection = rng.choice(len(points), args.points, replace=False)
        points = points[selection]
        if len(colors):
            colors = colors[selection]

    figure, axes = plt.subplots(1, 3, figsize=(16, 6), constrained_layout=True)
    panels = (
        (points[:, 0], points[:, 1], "Planta", "Este (m)", "Norte (m)"),
        (points[:, 0], points[:, 2], "Frente global", "Este (m)", "Altura (m)"),
        (points[:, 1], points[:, 2], "Lateral global", "Norte (m)", "Altura (m)"),
    )
    for axis, (horizontal, vertical, title, xlabel, ylabel) in zip(axes, panels, strict=True):
        color_values = colors if len(colors) == len(points) else points[:, 2]
        plot = axis.scatter(horizontal, vertical, c=color_values, s=0.15, cmap="turbo", rasterized=True)
        axis.set_aspect("equal")
        axis.set_title(title)
        axis.set_xlabel(xlabel)
        axis.set_ylabel(ylabel)
        if not len(colors):
            figure.colorbar(plot, ax=axis, shrink=0.7, label="Z (m)")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(args.output, dpi=180, facecolor="#f4f0e6")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
