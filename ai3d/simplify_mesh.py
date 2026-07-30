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
    parser.add_argument("--piece", choices=("caballo", "rey"), default="caballo")
    parser.add_argument("--faces", type=int, default=70_000)
    parser.add_argument("--yaw", type=float, default=0.0, help="Rotación final alrededor de Z en grados.")
    args = parser.parse_args()
    source = o3d.io.read_triangle_mesh(str(args.input))
    source.remove_duplicated_vertices()
    source.remove_duplicated_triangles()
    source.remove_degenerate_triangles()
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
    piece = config()["pieces"][args.piece]
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
