from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from src.io import save_ply


def build_poses(num_poses: int) -> list[dict]:
    poses: list[dict] = []
    for i in range(num_poses):
        angle = (2.0 * np.pi * i) / num_poses
        poses.append(
            {
                "position": [float(2.0 * np.cos(angle)), float(0.5 * np.sin(angle * 0.5)), float(2.0 * np.sin(angle))],
                "rotation": [0.0, float((i * 36.0) % 360.0), 0.0],
                "fovDegrees": 70.0,
            }
        )
    return poses


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic cross-reference fixture.")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output directory for fixture files.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    n = 1000

    positions = rng.uniform(-5.0, 5.0, size=(n, 3)).astype(np.float32)
    # Raw log-scales and raw logit opacities as required by reference algorithm.
    scales = rng.normal(loc=-1.5, scale=0.5, size=(n, 3)).astype(np.float32)
    rotations = np.tile(np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32), (n, 1))
    opacities = rng.normal(loc=0.2, scale=1.0, size=(n,)).astype(np.float32)
    colors = rng.uniform(-0.5, 0.5, size=(n, 3)).astype(np.float32)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    ply_path = args.out_dir / "crossref-1k.ply"
    poses_path = args.out_dir / "crossref-10poses.json"

    save_ply(
        ply_path,
        {
            "positions": positions,
            "scales": scales,
            "rotations": rotations,
            "opacities": opacities,
            "colors": colors,
        },
    )

    payload = {
        "seed": args.seed,
        "numGaussians": n,
        "nearPlane": 0.1,
        "farPlane": 150.0,
        "aspectRatio": 16 / 9,
        "poses": build_poses(10),
    }
    poses_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
