from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

import laspy
import numpy as np
import open3d as o3d
from pyproj import Transformer

from common import EXPERIMENTS, ensure_directories, write_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Normaliza y reduce la nube LiDAR oficial del Cabildo.")
    parser.add_argument("--voxel", type=float, default=0.04, help="Tamaño de voxel en metros.")
    parser.add_argument("--max-points", type=int, default=8_000_000)
    parser.add_argument("--source-epsg", type=int, default=4326)
    parser.add_argument("--metric-epsg", type=int, default=5347, help="POSGAR 2007 / Argentina 5.")
    parser.add_argument(
        "--crop",
        default="-28,52,-52,8,-6,78",
        help="xmin,xmax,ymin,ymax,zmin,zmax relativos al origen.",
    )
    args = parser.parse_args()
    ensure_directories()
    archive = EXPERIMENTS / "sources" / "cabildo" / "cabildo.zip"
    if not archive.exists():
        raise SystemExit("Primero ejecutá `npm run ai3d:fetch -- cabildo`.")

    extracted = archive.parent / "extracted"
    extracted.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as package:
        package.extractall(extracted)
    files = sorted([*extracted.rglob("*.las"), *extracted.rglob("*.laz")])
    if not files:
        raise SystemExit("El ZIP no contiene archivos LAS/LAZ.")

    chunks: list[np.ndarray] = []
    color_chunks: list[np.ndarray] = []
    classifications: dict[int, int] = {}
    for path in files:
        cloud = laspy.read(path)
        points = np.column_stack((cloud.x, cloud.y, cloud.z)).astype(np.float64)
        chunks.append(points)
        if all(hasattr(cloud, channel) for channel in ("red", "green", "blue")):
            colors = np.column_stack((cloud.red, cloud.green, cloud.blue)).astype(np.float64)
            maximum = 65535.0 if colors.max(initial=0) > 255 else 255.0
            color_chunks.append(np.clip(colors / maximum, 0, 1))
        if hasattr(cloud, "classification"):
            values, counts = np.unique(np.asarray(cloud.classification), return_counts=True)
            for value, count in zip(values, counts, strict=True):
                classifications[int(value)] = classifications.get(int(value), 0) + int(count)
    points = np.concatenate(chunks)
    colors = np.concatenate(color_chunks) if len(color_chunks) == len(chunks) else None
    finite = np.isfinite(points).all(axis=1)
    points = points[finite]
    if colors is not None:
        colors = colors[finite]
    if args.source_epsg != args.metric_epsg:
        transformer = Transformer.from_crs(args.source_epsg, args.metric_epsg, always_xy=True)
        east, north = transformer.transform(points[:, 0], points[:, 1])
        points[:, 0] = east
        points[:, 1] = north
    if len(points) > args.max_points:
        selection = np.linspace(0, len(points) - 1, args.max_points, dtype=np.int64)
        points = points[selection]
        if colors is not None:
            colors = colors[selection]

    origin = np.median(points, axis=0)
    points -= origin
    cloud = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(points))
    if colors is not None:
        cloud.colors = o3d.utility.Vector3dVector(colors)
    cloud = cloud.voxel_down_sample(args.voxel)
    output = EXPERIMENTS / "sources" / "cabildo" / "cabildo-centered.ply"
    o3d.io.write_point_cloud(str(output), cloud, write_ascii=False, compressed=True)
    centered_points = np.asarray(cloud.points)
    crop_values = np.asarray([float(value) for value in args.crop.split(",")])
    if len(crop_values) != 6:
        raise ValueError("--crop requiere seis números separados por coma")
    crop_mask = (
        (centered_points[:, 0] >= crop_values[0])
        & (centered_points[:, 0] <= crop_values[1])
        & (centered_points[:, 1] >= crop_values[2])
        & (centered_points[:, 1] <= crop_values[3])
        & (centered_points[:, 2] >= crop_values[4])
        & (centered_points[:, 2] <= crop_values[5])
    )
    cropped = cloud.select_by_index(np.flatnonzero(crop_mask).tolist())
    cropped_output = EXPERIMENTS / "sources" / "cabildo" / "cabildo-cropped.ply"
    o3d.io.write_point_cloud(str(cropped_output), cropped, write_ascii=False, compressed=True)
    bounds = np.vstack((np.asarray(cloud.get_min_bound()), np.asarray(cloud.get_max_bound())))
    manifest = write_manifest(
        "cabildo-lidar",
        {
            "input_files": [str(path) for path in files],
            "source_points": int(finite.sum()),
            "output_points": len(cloud.points),
            "origin": origin.tolist(),
            "source_epsg": args.source_epsg,
            "metric_epsg": args.metric_epsg,
            "bounds_centered": bounds.tolist(),
            "classifications": classifications,
            "has_rgb": colors is not None,
            "crop": crop_values.tolist(),
            "cropped_points": len(cropped.points),
            "cropped_output": str(cropped_output),
            "output": str(output),
        },
    )
    print(
        json.dumps(
            {
                "output": str(output),
                "points": len(cloud.points),
                "cropped_output": str(cropped_output),
                "cropped_points": len(cropped.points),
                "manifest": str(manifest),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
