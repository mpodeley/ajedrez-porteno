from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import trimesh
from scipy import ndimage

from common import EXPERIMENTS, config, ensure_directories, write_manifest


def load_mesh(path: Path) -> trimesh.Trimesh:
    loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Scene):
        meshes = [geometry for geometry in loaded.geometry.values() if isinstance(geometry, trimesh.Trimesh)]
        if not meshes:
            raise ValueError("El archivo no contiene mallas triangulares")
        mesh = trimesh.util.concatenate(meshes)
    else:
        mesh = loaded
    mesh.remove_unreferenced_vertices()
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.update_faces(mesh.unique_faces())
    mesh.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(mesh, multibody=False)
    return mesh


def orient(mesh: trimesh.Trimesh, up: str) -> None:
    transforms = {
        "z": np.eye(4),
        "y": trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]),
        "x": trimesh.transformations.rotation_matrix(-np.pi / 2, [0, 1, 0]),
    }
    mesh.apply_transform(transforms[up])


def chess_base(diameter: float, height: float) -> trimesh.Trimesh:
    radius = diameter / 2
    profile = np.array(
        [
            [0.0, 0.0],
            [radius, 0.0],
            [radius, height * 0.18],
            [radius * 0.96, height * 0.32],
            [radius * 0.82, height * 0.54],
            [radius * 0.76, height * 0.72],
            [radius * 0.66, height],
            [0.0, height],
        ]
    )
    return trimesh.creation.revolve(profile, sections=128)


def equestrian_pedestal(start_z: float, top_z: float) -> trimesh.Trimesh:
    lower_height = 2.8
    upper_height = 3.0
    lower = trimesh.creation.box(
        [20.0, 17.0, lower_height],
        transform=trimesh.transformations.translation_matrix(
            [0, 0, start_z + lower_height / 2 - 0.5]
        ),
    )
    upper = trimesh.creation.box(
        [29.0, 17.0, upper_height],
        transform=trimesh.transformations.translation_matrix(
            [0, 0, top_z - upper_height / 2 + 0.5]
        ),
    )
    z0 = start_z + lower_height - 0.8
    z1 = top_z - upper_height + 0.8
    vertices = np.array(
        [
            [-8.2, -6.8, z0],
            [8.2, -6.8, z0],
            [8.2, 6.8, z0],
            [-8.2, 6.8, z0],
            [-11.0, -6.4, z1],
            [11.0, -6.4, z1],
            [11.0, 6.4, z1],
            [-11.0, 6.4, z1],
        ]
    )
    faces = np.array(
        [
            [0, 2, 1], [0, 3, 2],
            [4, 5, 6], [4, 6, 7],
            [0, 1, 5], [0, 5, 4],
            [1, 2, 6], [1, 6, 5],
            [2, 3, 7], [2, 7, 6],
            [3, 0, 4], [3, 4, 7],
        ],
        dtype=np.int64,
    )
    body = trimesh.Trimesh(vertices=vertices, faces=faces, process=True)
    return trimesh.util.concatenate([lower, body, upper])


def landmark_pedestal(start_z: float, top_z: float, icon_width: float) -> trimesh.Trimesh:
    height = max(top_z - start_z, 1.2)
    lower_radius = min(icon_width * 0.34, 8.5)
    upper_radius = min(icon_width * 0.43, 10.5)
    profile = np.array(
        [
            [0.0, 0.0],
            [lower_radius, 0.0],
            [lower_radius, height * 0.12],
            [lower_radius * 0.82, height * 0.28],
            [upper_radius * 0.72, height * 0.76],
            [upper_radius, height * 0.9],
            [upper_radius, height],
            [0.0, height],
        ]
    )
    pedestal = trimesh.creation.revolve(profile, sections=96)
    pedestal.apply_translation([0, 0, start_z])
    return pedestal


def voxel_union(
    meshes: list[trimesh.Trimesh],
    pitch: float,
    *,
    self_support: bool = False,
    support_report: dict[str, Any] | None = None,
    support_min_height_mm: float = 14.0,
    support_max_height_mm: float = 42.0,
    support_min_area_voxels: int = 10,
) -> trimesh.Trimesh:
    joined = trimesh.util.concatenate(meshes)
    grid = joined.voxelized(pitch=pitch, method="subdivide")
    matrix = np.asarray(grid.matrix, dtype=bool)
    matrix = ndimage.binary_dilation(matrix, iterations=1)
    matrix = ndimage.binary_closing(matrix, iterations=1)
    matrix = ndimage.binary_fill_holes(matrix)
    pillar_count = 0
    pillar_voxels = 0
    support_events: list[dict[str, int | float]] = []
    if self_support:
        for layer in range(1, matrix.shape[2]):
            previous = ndimage.binary_dilation(matrix[:, :, layer - 1], iterations=1)
            labels_2d, count_2d = ndimage.label(matrix[:, :, layer])
            for label_id in range(1, count_2d + 1):
                island = labels_2d == label_id
                height_mm = layer * pitch
                if (
                    height_mm < support_min_height_mm
                    or height_mm > support_max_height_mm
                    or int(island.sum()) < support_min_area_voxels
                ):
                    continue
                if np.any(island & previous):
                    continue
                footprint = ndimage.binary_dilation(island, iterations=2)
                overlap = np.any(
                    matrix[:, :, :layer] & footprint[:, :, None],
                    axis=(0, 1),
                )
                overlap_layers = np.flatnonzero(overlap)
                start_layer = int(overlap_layers[-1] + 1) if len(overlap_layers) else 0
                before = int(matrix[:, :, start_layer:layer].sum())
                matrix[:, :, start_layer:layer] |= footprint[:, :, None]
                added = int(matrix[:, :, start_layer:layer].sum()) - before
                if added:
                    pillar_count += 1
                    pillar_voxels += added
                    support_events.append(
                        {"layer": layer, "height_mm": round(height_mm, 2), "area_voxels": int(island.sum())}
                    )
    if support_report is not None:
        support_report.update(
            {"pillars": pillar_count, "pillar_voxels": pillar_voxels, "events": support_events}
        )
    labels, count = ndimage.label(matrix)
    if count:
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        matrix = labels == sizes.argmax()
    repaired = trimesh.voxel.ops.matrix_to_marching_cubes(matrix, pitch=pitch)
    origin = grid.indices_to_points(np.array([[0, 0, 0]]))[0]
    repaired.apply_translation(origin)
    repaired.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(repaired, multibody=True)
    return repaired


def main() -> int:
    parser = argparse.ArgumentParser(description="Normaliza, escala y une un candidato AI con una base imprimible.")
    parser.add_argument("mesh", type=Path)
    parser.add_argument(
        "--piece",
        choices=("rey", "reina", "alfil", "caballo", "torre", "peon"),
        default="caballo",
    )
    parser.add_argument("--up", choices=("x", "y", "z"), default="y")
    parser.add_argument("--pitch", type=float, default=0.35, help="Resolución de reparación en milímetros.")
    parser.add_argument("--no-support", action="store_true", help="No agrega el apoyo escultórico bajo el vientre.")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    ensure_directories()
    piece = config()["pieces"][args.piece]
    mesh = load_mesh(args.mesh)
    orient(mesh, args.up)

    bounds = mesh.bounds
    extent = bounds[1] - bounds[0]
    available_icon_height = piece["height_mm"] - piece["icon_start_mm"] + 0.8
    if args.piece == "caballo":
        statue_scale = piece["icon_width_mm"] / max(extent)
    else:
        statue_scale = min(
            piece["icon_width_mm"] / max(extent[0], extent[1]),
            available_icon_height / extent[2],
        )
    mesh.apply_scale(statue_scale)
    mesh.apply_translation(-mesh.bounds.mean(axis=0))
    mesh.apply_translation([0, 0, piece["height_mm"] - mesh.bounds[1, 2]])
    statue_bottom = float(mesh.bounds[0, 2])
    scale_mode = "isotropic"

    base = chess_base(piece["base_diameter_mm"], piece["icon_start_mm"])
    parts = [base, mesh]
    if args.piece == "caballo":
        parts.append(equestrian_pedestal(piece["icon_start_mm"], statue_bottom + 0.8))
    else:
        parts.append(
            landmark_pedestal(
                piece["icon_start_mm"],
                statue_bottom + 0.8,
                piece["icon_width_mm"],
            )
        )
    support_report: dict[str, Any] = {}
    combined = voxel_union(
        parts,
        args.pitch,
        self_support=args.piece == "caballo" and not args.no_support,
        support_report=support_report,
        support_min_height_mm=max(piece["icon_start_mm"], statue_bottom + 3.0),
        support_max_height_mm=(
            statue_bottom + mesh.extents[2] * 0.55
            if args.piece == "caballo"
            else piece["height_mm"] - 4.0
        ),
    )
    combined.apply_translation([0, 0, -combined.bounds[0, 2]])
    horizontal_correction = piece["base_diameter_mm"] / max(combined.extents[0], combined.extents[1])
    vertical_correction = piece["height_mm"] / combined.extents[2]
    combined.apply_scale([horizontal_correction, horizontal_correction, vertical_correction])

    output = args.output or EXPERIMENTS / "repaired" / f"{args.piece}-{args.mesh.stem}-fdm.stl"
    output.parent.mkdir(parents=True, exist_ok=True)
    combined.export(output)
    components = combined.split(only_watertight=False)
    report = {
        "input": str(args.mesh.resolve()),
        "output": str(output.resolve()),
        "vertices": len(combined.vertices),
        "faces": len(combined.faces),
        "watertight": bool(combined.is_watertight),
        "winding_consistent": bool(combined.is_winding_consistent),
        "components": len(components),
        "bounds": combined.bounds.tolist(),
        "extents_mm": combined.extents.tolist(),
        "volume_mm3": float(combined.volume),
        "repair_pitch_mm": args.pitch,
        "support_added": args.piece == "caballo" and not args.no_support,
        "scale_mode": scale_mode,
        "statue_height_mm": float(mesh.extents[2]),
        "pedestal_top_mm": float(statue_bottom + 0.8),
        "self_support_pillars": support_report.get("pillars", 0),
        "self_support_voxels": support_report.get("pillar_voxels", 0),
        "self_support_events": support_report.get("events", []),
    }
    manifest = write_manifest(f"repair-{args.piece}-{args.mesh.stem}", report)
    print(json.dumps({**report, "manifest": str(manifest)}, indent=2))
    if not combined.is_watertight or len(components) != 1:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
