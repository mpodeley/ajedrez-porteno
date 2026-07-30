from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import open3d as o3d
import trimesh
from scipy import ndimage

from common import EXPERIMENTS, config, ensure_directories, write_manifest
from repair_fdm import chess_base, voxel_union


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Construye un candidato de silueta sólida desde el escaneo LiDAR 2016 del Cabildo."
    )
    parser.add_argument("--sample-pitch", type=float, default=0.14, help="Resolución 2D del LiDAR en metros.")
    parser.add_argument("--repair-pitch", type=float, default=0.4, help="Resolución final en milímetros.")
    parser.add_argument("--output", type=Path, default=EXPERIMENTS / "repaired" / "rey-cabildo-lidar-fdm.stl")
    args = parser.parse_args()
    ensure_directories()
    source = EXPERIMENTS / "sources" / "cabildo" / "cabildo-cropped.ply"
    if not source.exists():
        raise SystemExit("Primero ejecutá `ai3d/prepare_lidar.py`.")
    points = np.asarray(o3d.io.read_point_cloud(str(source)).points)

    # Franja de fachada: excluye la mayor parte de árboles, vereda y edificios vecinos.
    selected = points[
        (points[:, 0] >= -14)
        & (points[:, 0] <= 43)
        & (points[:, 1] >= -38)
        & (points[:, 1] <= -19)
        & (points[:, 2] >= -1)
        & (points[:, 2] <= 58)
    ]
    if len(selected) < 10_000:
        raise RuntimeError("El recorte LiDAR quedó vacío o demasiado pequeño")
    x_edges = np.arange(selected[:, 0].min(), selected[:, 0].max() + args.sample_pitch, args.sample_pitch)
    z_edges = np.arange(selected[:, 2].min(), selected[:, 2].max() + args.sample_pitch, args.sample_pitch)
    histogram, _, _ = np.histogram2d(selected[:, 0], selected[:, 2], bins=(x_edges, z_edges))
    silhouette = histogram >= 2
    silhouette = ndimage.binary_closing(silhouette, iterations=2)
    silhouette = ndimage.binary_dilation(silhouette, iterations=1)
    labels, count = ndimage.label(silhouette)
    if count:
        sizes = np.bincount(labels.ravel())
        keep = np.flatnonzero(sizes >= max(24, sizes.max() * 0.004))
        keep = keep[keep != 0]
        silhouette = np.isin(labels, keep)
    silhouette = ndimage.binary_fill_holes(silhouette)

    depth_cells = 11
    volume = np.repeat(silhouette[:, None, :], depth_cells, axis=1)
    relief = trimesh.voxel.ops.matrix_to_marching_cubes(volume, pitch=1.0)
    piece = config()["pieces"]["rey"]
    icon_height = piece["height_mm"] - piece["icon_start_mm"] + 0.8
    relief.apply_scale(
        [
            piece["icon_width_mm"] / relief.extents[0],
            8.0 / relief.extents[1],
            icon_height / relief.extents[2],
        ]
    )
    relief.apply_translation(-relief.bounds.mean(axis=0))
    relief.apply_translation([0, 0, piece["icon_start_mm"] - relief.bounds[0, 2] - 0.8])
    base = chess_base(piece["base_diameter_mm"], piece["icon_start_mm"])
    combined = voxel_union([base, relief], args.repair_pitch)
    combined.apply_translation([0, 0, -combined.bounds[0, 2]])
    combined.apply_scale(
        [
            piece["base_diameter_mm"] / max(combined.extents[:2]),
            piece["base_diameter_mm"] / max(combined.extents[:2]),
            piece["height_mm"] / combined.extents[2],
        ]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    combined.export(args.output)
    report = {
        "source": str(source),
        "selected_points": len(selected),
        "sample_pitch_m": args.sample_pitch,
        "repair_pitch_mm": args.repair_pitch,
        "output": str(args.output),
        "vertices": len(combined.vertices),
        "faces": len(combined.faces),
        "watertight": bool(combined.is_watertight),
        "components": len(combined.split(only_watertight=False)),
        "extents_mm": combined.extents.tolist(),
        "caveat": "Escaneo 2016 con lona de obra, arbolado y cobertura posterior incompleta.",
    }
    manifest = write_manifest("cabildo-lidar-candidate", report)
    print(json.dumps({**report, "manifest": str(manifest)}, ensure_ascii=False, indent=2))
    return 0 if combined.is_watertight and report["components"] == 1 else 2


if __name__ == "__main__":
    raise SystemExit(main())
