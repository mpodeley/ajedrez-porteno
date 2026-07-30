from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import open3d as o3d
import trimesh

from common import config


def main() -> int:
    parser = argparse.ArgumentParser(description="Reduce triángulos conservando medidas y cierre.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--piece",
        choices=("rey", "reina", "alfil", "caballo", "torre", "peon"),
        default="caballo",
    )
    parser.add_argument("--faces", type=int, default=70_000)
    parser.add_argument("--yaw", type=float, default=0.0, help="Rotación final alrededor de Z en grados.")
    parser.add_argument("--smooth-iterations", type=int, default=12)
    args = parser.parse_args()
    source = o3d.io.read_triangle_mesh(str(args.input))
    source.remove_duplicated_vertices()
    source.remove_duplicated_triangles()
    source.remove_degenerate_triangles()
    piece = config()["pieces"][args.piece]
    if args.smooth_iterations:
        original = np.asarray(source.vertices).copy()
        smoothed = source.filter_smooth_taubin(
            number_of_iterations=args.smooth_iterations,
            lambda_filter=0.45,
            mu=-0.48,
        )
        filtered = np.asarray(smoothed.vertices)
        transition = np.clip(
            (original[:, 2] - piece["icon_start_mm"]) / 5.0,
            0.0,
            1.0,
        )[:, None]
        source.vertices = o3d.utility.Vector3dVector(
            original * (1.0 - transition) + filtered * transition
        )
    simplified = source.simplify_quadric_decimation(args.faces)
    simplified.remove_duplicated_vertices()
    simplified.remove_duplicated_triangles()
    simplified.remove_degenerate_triangles()
    vertices = np.asarray(simplified.vertices)
    faces = np.asarray(simplified.triangles)
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=True)
    if args.yaw:
        mesh.apply_transform(
            trimesh.transformations.rotation_matrix(np.deg2rad(args.yaw), [0, 0, 1])
        )
    mesh.apply_translation([0, 0, -mesh.bounds[0, 2]])
    mesh.apply_scale(
        [
            piece["base_diameter_mm"] / max(mesh.extents[:2]),
            piece["base_diameter_mm"] / max(mesh.extents[:2]),
            piece["height_mm"] / mesh.extents[2],
        ]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(args.output)
    report = {
        "input_faces": len(source.triangles),
        "output_faces": len(mesh.faces),
        "watertight": bool(mesh.is_watertight),
        "components": len(mesh.split(only_watertight=False)),
        "extents_mm": mesh.extents.tolist(),
        "output": str(args.output),
    }
    print(json.dumps(report, indent=2))
    return 0 if report["watertight"] and report["components"] == 1 else 2


if __name__ == "__main__":
    raise SystemExit(main())
