from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.spatial.distance import cdist


def spatial_split(poses: list[dict], mode: str = "trajectory_half") -> tuple[list[int], list[int]]:
    """Split poses into train-half and free-roam test-half."""
    n = len(poses)
    if mode == "trajectory_half":
        split = int(0.7 * n)
        return list(range(split)), list(range(split, n))
    if mode == "spatial_cluster":
        from sklearn.cluster import KMeans

        positions = np.array([p["position"] for p in poses], dtype=np.float32)
        labels = KMeans(n_clusters=2, random_state=42, n_init=10).fit_predict(positions)
        train_idx = [i for i, l in enumerate(labels) if l == 0]
        test_idx = [i for i, l in enumerate(labels) if l == 1]
        if len(train_idx) < len(test_idx):
            train_idx, test_idx = test_idx, train_idx
        return train_idx, test_idx
    raise ValueError(f"unknown mode: {mode}")


if __name__ == "__main__":
    import sys

    scene_dir = Path(sys.argv[1])
    mode = sys.argv[2] if len(sys.argv) > 2 else "trajectory_half"

    train_payload = json.loads((scene_dir / "poses_train.json").read_text(encoding="utf-8"))
    test_payload = json.loads((scene_dir / "poses_test.json").read_text(encoding="utf-8"))
    train = train_payload["poses"]
    test = test_payload["poses"]
    all_poses = train + test

    train_idx, test_idx = spatial_split(all_poses, mode)

    suffix = f"_{mode}"
    out_train = dict(train_payload)
    out_train["poses"] = [all_poses[i] for i in train_idx]
    (scene_dir / f"poses_train{suffix}.json").write_text(
        json.dumps(out_train, indent=2), encoding="utf-8"
    )

    out_test = dict(test_payload)
    out_test["poses"] = [all_poses[i] for i in test_idx]
    (scene_dir / f"poses_test{suffix}.json").write_text(
        json.dumps(out_test, indent=2), encoding="utf-8"
    )

    print(f"{scene_dir.name}: train={len(train_idx)}, test={len(test_idx)}")

    train_pos = np.array([all_poses[i]["position"] for i in train_idx], dtype=np.float32)
    test_pos = np.array([all_poses[i]["position"] for i in test_idx], dtype=np.float32)
    dists = cdist(test_pos, train_pos)
    nearest = dists.min(axis=1)
    print(
        f"  test-to-nearest-train: min={nearest.min():.2f}, "
        f"median={np.median(nearest):.2f}, max={nearest.max():.2f}"
    )
