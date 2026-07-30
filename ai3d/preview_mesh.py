from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import trimesh
from mpl_toolkits.mplot3d.art3d import Poly3DCollection


def load(path: Path) -> trimesh.Trimesh:
    asset = trimesh.load(path, force="scene")
    if isinstance(asset, trimesh.Scene):
        meshes = [item for item in asset.geometry.values() if isinstance(item, trimesh.Trimesh)]
        return trimesh.util.concatenate(meshes)
    return asset


def main() -> int:
    parser = argparse.ArgumentParser(description="Render ortográfico rápido de un candidato 3D.")
    parser.add_argument("mesh", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--faces", type=int, default=320_000)
    parser.add_argument("--up", choices=("x", "y", "z"), default="z")
    args = parser.parse_args()
    mesh = load(args.mesh)
    transforms = {
        "z": np.eye(4),
        "y": trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]),
        "x": trimesh.transformations.rotation_matrix(-np.pi / 2, [0, 1, 0]),
    }
    mesh.apply_transform(transforms[args.up])
    faces = mesh.faces
    if len(faces) > args.faces:
        rng = np.random.default_rng(2026)
        faces = faces[rng.choice(len(faces), args.faces, replace=False)]
    triangles = mesh.vertices[faces]
    normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    lengths = np.linalg.norm(normals, axis=1)
    normals /= np.maximum(lengths[:, None], 1e-12)
    light = np.array([0.4, -0.7, 0.6])
    light /= np.linalg.norm(light)
    brightness = np.clip(0.34 + 0.66 * np.abs(normals @ light), 0, 1)
    base = np.array([110, 36, 52]) / 255
    facecolors = np.clip(base[None, :] * brightness[:, None] + 0.08, 0, 1)
    center = mesh.bounds.mean(axis=0)
    radius = mesh.extents.max() * 0.58
    views = (
        ("Frente", 0, -90),
        ("3/4", 18, -45),
        ("Lateral", 0, 0),
        ("Posterior", 0, 90),
    )
    figure = plt.figure(figsize=(14, 4), facecolor="#f3eee2")
    for index, (title, elevation, azimuth) in enumerate(views, 1):
        axis = figure.add_subplot(1, 4, index, projection="3d")
        collection = Poly3DCollection(
            triangles,
            facecolors=facecolors,
            edgecolor="none",
            linewidth=0,
            alpha=1,
        )
        axis.add_collection3d(collection)
        axis.set_xlim(center[0] - radius, center[0] + radius)
        axis.set_ylim(center[1] - radius, center[1] + radius)
        axis.set_zlim(center[2] - radius, center[2] + radius)
        axis.set_box_aspect((1, 1, 1))
        axis.view_init(elev=elevation, azim=azimuth)
        axis.set_proj_type("ortho")
        axis.set_axis_off()
        axis.set_title(title, color="#17243c")
    output = args.output or args.mesh.with_suffix(".preview.png")
    figure.tight_layout()
    figure.savefig(output, dpi=180, facecolor=figure.get_facecolor())
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
