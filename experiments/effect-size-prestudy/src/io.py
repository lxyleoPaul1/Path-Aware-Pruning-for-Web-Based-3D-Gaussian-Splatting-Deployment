from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from plyfile import PlyData, PlyElement


def _require_fields(vertex: np.ndarray, fields: list[str]) -> None:
    missing = [name for name in fields if name not in vertex.dtype.names]
    if missing:
        raise ValueError(f"PLY is missing required fields: {missing}")


def load_ply(path: str | Path) -> dict[str, np.ndarray]:
    """Load Gaussian splat attributes from a vertex PLY file."""
    ply = PlyData.read(str(path))
    vertex = ply["vertex"].data

    required = [
        "x",
        "y",
        "z",
        "scale_0",
        "scale_1",
        "scale_2",
        "rot_0",
        "rot_1",
        "rot_2",
        "rot_3",
        "opacity",
        "f_dc_0",
        "f_dc_1",
        "f_dc_2",
    ]
    _require_fields(vertex, required)

    positions = np.stack([vertex["x"], vertex["y"], vertex["z"]], axis=1).astype(np.float32)
    scales = np.stack([vertex["scale_0"], vertex["scale_1"], vertex["scale_2"]], axis=1).astype(np.float32)
    rotations = np.stack(
        [vertex["rot_0"], vertex["rot_1"], vertex["rot_2"], vertex["rot_3"]], axis=1
    ).astype(np.float32)
    opacities = np.asarray(vertex["opacity"], dtype=np.float32)
    colors = np.stack([vertex["f_dc_0"], vertex["f_dc_1"], vertex["f_dc_2"]], axis=1).astype(np.float32)

    # Full 3DGS schema support: SH degree 0 (f_dc_*) and optional SH degree 1-3 (f_rest_*).
    rest_names = sorted([name for name in vertex.dtype.names if name.startswith("f_rest_")], key=lambda x: int(x.split("_")[-1]))
    if rest_names:
        sh_rest = np.stack([vertex[name] for name in rest_names], axis=1).astype(np.float32)
    else:
        sh_rest = np.zeros((positions.shape[0], 0), dtype=np.float32)

    return {
        "positions": positions,
        "scales": scales,
        "rotations": rotations,
        "opacities": opacities,
        "colors": colors,
        "sh_dc": colors,
        "sh_rest": sh_rest,
    }


def save_ply(path: str | Path, data: dict[str, Any]) -> None:
    """Save Gaussian splat attributes into a vertex PLY file."""
    positions = np.asarray(data["positions"], dtype=np.float32)
    scales = np.asarray(data["scales"], dtype=np.float32)
    rotations = np.asarray(data["rotations"], dtype=np.float32)
    opacities = np.asarray(data["opacities"], dtype=np.float32)
    colors = np.asarray(data["colors"], dtype=np.float32)

    n = positions.shape[0]
    if positions.shape != (n, 3):
        raise ValueError("positions must have shape (N, 3)")
    if scales.shape != (n, 3):
        raise ValueError("scales must have shape (N, 3)")
    if rotations.shape != (n, 4):
        raise ValueError("rotations must have shape (N, 4) in wxyz order")
    if opacities.shape != (n,):
        raise ValueError("opacities must have shape (N,)")
    if colors.shape != (n, 3):
        raise ValueError("colors must have shape (N, 3)")

    vertex = np.empty(
        n,
        dtype=[
            ("x", "f4"),
            ("y", "f4"),
            ("z", "f4"),
            ("scale_0", "f4"),
            ("scale_1", "f4"),
            ("scale_2", "f4"),
            ("rot_0", "f4"),
            ("rot_1", "f4"),
            ("rot_2", "f4"),
            ("rot_3", "f4"),
            ("opacity", "f4"),
            ("f_dc_0", "f4"),
            ("f_dc_1", "f4"),
            ("f_dc_2", "f4"),
        ],
    )
    vertex["x"] = positions[:, 0]
    vertex["y"] = positions[:, 1]
    vertex["z"] = positions[:, 2]
    vertex["scale_0"] = scales[:, 0]
    vertex["scale_1"] = scales[:, 1]
    vertex["scale_2"] = scales[:, 2]
    vertex["rot_0"] = rotations[:, 0]
    vertex["rot_1"] = rotations[:, 1]
    vertex["rot_2"] = rotations[:, 2]
    vertex["rot_3"] = rotations[:, 3]
    vertex["opacity"] = opacities
    vertex["f_dc_0"] = colors[:, 0]
    vertex["f_dc_1"] = colors[:, 1]
    vertex["f_dc_2"] = colors[:, 2]

    element = PlyElement.describe(vertex, "vertex")
    PlyData([element], text=False).write(str(path))

