from __future__ import annotations

from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.io import save_ply


def main() -> None:
    out = Path("output")
    out.mkdir(parents=True, exist_ok=True)
    path = out / "sanity_cube.ply"

    corners = [-1.0, 1.0]
    positions = np.array(
        [[x, y, z] for x in corners for y in corners for z in corners],
        dtype=np.float32,
    )
    scales = np.full((8, 3), 0.18, dtype=np.float32)
    rotations = np.tile(np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32), (8, 1))
    opacities = np.full((8,), 0.9, dtype=np.float32)
    colors = np.array(
        [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
            [1.0, 1.0, 0.0],
            [1.0, 0.0, 1.0],
            [0.0, 1.0, 1.0],
            [1.0, 0.5, 0.0],
            [0.9, 0.9, 0.9],
        ],
        dtype=np.float32,
    )

    save_ply(
        path,
        {
            "positions": positions,
            "scales": scales,
            "rotations": rotations,
            "opacities": opacities,
            "colors": colors,
        },
    )
    print(path.as_posix())


if __name__ == "__main__":
    main()

