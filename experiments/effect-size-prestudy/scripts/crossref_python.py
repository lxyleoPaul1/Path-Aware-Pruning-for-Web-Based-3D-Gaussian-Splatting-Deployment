from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

from src.io import load_ply
from src.pruning import path_aware_v5_linear_falloff


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Python side cross-reference for filterByPath.")
    parser.add_argument("--ply", type=Path, required=True, help="Path to crossref-1k.ply")
    parser.add_argument("--poses", type=Path, required=True, help="Path to crossref-10poses.json")
    parser.add_argument("--keep-ratio", type=float, default=0.5)
    parser.add_argument("--out", type=Path, default=Path("crossref-py-output.txt"))
    parser.add_argument("--scores-out", type=Path, default=Path("crossref-py-scores.json"))
    args = parser.parse_args()

    payload = json.loads(args.poses.read_text(encoding="utf-8"))
    poses = [
        {
            "position": p["position"],
            "rotation_euler_deg": p.get("rotation_euler_deg", p["rotation"]),
            "fov_deg": p.get("fov_deg", p["fovDegrees"]),
        }
        for p in payload["poses"]
    ]
    near = float(payload.get("nearPlane", 0.1))
    far = float(payload.get("farPlane", 150.0))
    aspect = float(payload.get("aspectRatio", 16 / 9))

    data = load_ply(args.ply)
    scores = path_aware_v5_linear_falloff(
        positions=data["positions"],
        scales=data["scales"],
        opacities=data["opacities"],
        rotations=data["rotations"],
        poses=poses,
        near=near,
        far=far,
        aspect=aspect,
    )

    n = int(scores.shape[0])
    keep_count = int(math.ceil(args.keep_ratio * n))
    retained = np.argsort(scores)[::-1][:keep_count]
    retained_sorted = np.sort(retained).astype(np.int64)

    args.out.write_text("\n".join(str(v) for v in retained_sorted.tolist()) + "\n", encoding="utf-8")
    args.scores_out.write_text(json.dumps([float(v) for v in scores.tolist()]), encoding="utf-8")


if __name__ == "__main__":
    main()
