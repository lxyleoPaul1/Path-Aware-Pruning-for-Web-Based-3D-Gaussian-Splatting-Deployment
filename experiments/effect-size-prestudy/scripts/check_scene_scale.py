from __future__ import annotations

import json
from pathlib import Path

import numpy as np


def load_positions(poses_json: Path) -> np.ndarray:
    payload = json.loads(poses_json.read_text(encoding="utf-8"))
    poses = payload.get("poses", [])
    pos = np.asarray([p["position"] for p in poses], dtype=np.float64)
    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError(f"invalid pose positions in {poses_json}")
    return pos


def summarize(name: str, positions: np.ndarray) -> None:
    pmin = positions.min(axis=0)
    pmax = positions.max(axis=0)
    diag = float(np.linalg.norm(pmax - pmin))
    center = positions.mean(axis=0)
    radii = np.linalg.norm(positions - center[None, :], axis=1)
    mean_radius = float(np.mean(radii))
    median_radius = float(np.median(radii))
    max_radius = float(np.max(radii))
    print(f"[{name}] n={len(positions)}")
    print(f"  bbox_min={pmin.tolist()}")
    print(f"  bbox_max={pmax.tolist()}")
    print(f"  bbox_diag={diag:.6f}")
    print(f"  center={center.tolist()}")
    print(f"  radius_mean={mean_radius:.6f}")
    print(f"  radius_median={median_radius:.6f}")
    print(f"  radius_max={max_radius:.6f}")


def main() -> None:
    root = Path("data")
    kitchen_json = root / "mipnerf360" / "kitchen" / "poses_train.json"
    train_json = root / "tandt" / "train" / "poses_train.json"
    if not kitchen_json.exists() or not train_json.exists():
        raise FileNotFoundError("missing poses_train.json for kitchen or train")

    kitchen_pos = load_positions(kitchen_json)
    train_pos = load_positions(train_json)
    summarize("kitchen", kitchen_pos)
    summarize("train", train_pos)

    k_center = kitchen_pos.mean(axis=0)
    t_center = train_pos.mean(axis=0)
    k_scale = float(np.mean(np.linalg.norm(kitchen_pos - k_center[None, :], axis=1)))
    t_scale = float(np.mean(np.linalg.norm(train_pos - t_center[None, :], axis=1)))
    d_k = float(np.linalg.norm(kitchen_pos.max(axis=0) - kitchen_pos.min(axis=0)))
    d_t = float(np.linalg.norm(train_pos.max(axis=0) - train_pos.min(axis=0)))
    print("\n[ratio train/kitchen]")
    print(f"  bbox_diag_ratio={d_t / max(d_k, 1e-12):.6f}")
    print(f"  mean_radius_ratio={t_scale / max(k_scale, 1e-12):.6f}")


if __name__ == "__main__":
    main()
