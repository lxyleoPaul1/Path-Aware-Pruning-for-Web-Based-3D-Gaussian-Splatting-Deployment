from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.baselines.lightgaussian import lightgaussian_importance
from src.io import load_ply
from src.metrics import psnr
from src.render import render_views


SCENES = ["kitchen", "room", "counter", "truck"]
KEEP_RATIO = 0.5
CAPTURE = "sparse"


def _sigmoid(x: np.ndarray) -> np.ndarray:
    x64 = np.asarray(x, dtype=np.float64)
    return np.where(x64 >= 0.0, 1.0 / (1.0 + np.exp(-x64)), np.exp(x64) / (1.0 + np.exp(x64)))


def _load_poses(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    poses = payload["poses"]
    for p in poses:
        if "rotation_euler_deg" not in p and "rotation" in p:
            p["rotation_euler_deg"] = p["rotation"]
        if "fov_deg" not in p and "fov_degrees" in p:
            p["fov_deg"] = p["fov_degrees"]
    return poses


def _scene_dir(data_root: Path, scene: str) -> Path | None:
    candidates = [data_root / "mipnerf360" / scene, data_root / scene]
    for c in candidates:
        if c.exists():
            return c
    return None


def _topk_mask(scores: np.ndarray, keep_ratio: float) -> np.ndarray:
    n = scores.shape[0]
    keep_count = int(math.ceil(keep_ratio * n))
    keep_count = max(0, min(n, keep_count))
    idx = np.argsort(scores)[::-1]
    mask = np.zeros(n, dtype=bool)
    mask[idx[:keep_count]] = True
    return mask


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate LightGaussian baseline on sparse captures.")
    parser.add_argument("--data-root", type=Path, default=Path("data"))
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--width", type=int, default=800)
    parser.add_argument("--height", type=int, default=450)
    parser.add_argument("--formula-sweep-csv", type=Path, default=Path("output/formula_sweep.csv"))
    args = parser.parse_args()

    out_dir = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_dir / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    image_size = (int(args.width), int(args.height))

    baseline_rows: list[dict] = []
    if args.formula_sweep_csv.exists():
        df_base = pd.read_csv(args.formula_sweep_csv)
        sub = df_base[(df_base["capture"] == CAPTURE) & (np.isclose(df_base["keep_ratio"], KEEP_RATIO))]
        sub = sub[sub["scene"].isin(SCENES)]
        baseline_rows.extend(sub.to_dict(orient="records"))

    lg_rows: list[dict] = []
    for scene in SCENES:
        scene_dir = _scene_dir(args.data_root, scene)
        if scene_dir is None:
            print(f"[skip] {scene}: missing scene directory under {args.data_root}")
            continue

        ply_path = scene_dir / "point_cloud.ply"
        train_sparse_path = scene_dir / "poses_train_sparse.json"
        train_dense_path = scene_dir / "poses_train.json"
        test_path = scene_dir / "poses_test.json"
        train_path = train_sparse_path if train_sparse_path.exists() else train_dense_path
        if not ply_path.exists() or not train_path.exists() or not test_path.exists():
            print(f"[skip] {scene}: missing point_cloud/poses files")
            continue

        train_poses = _load_poses(train_path)
        test_poses = _load_poses(test_path)
        scene_data = load_ply(ply_path)
        positions = scene_data["positions"].astype(np.float32)
        scales_raw = scene_data["scales"].astype(np.float32)
        rotations = scene_data["rotations"].astype(np.float32)
        opacities_raw = scene_data["opacities"].astype(np.float32)
        colors = scene_data["colors"].astype(np.float32)
        scales_linear = np.exp(scales_raw).astype(np.float32)
        opacities_alpha = _sigmoid(opacities_raw).astype(np.float32)

        full_cache = cache_dir / f"{scene}_full_{image_size[0]}x{image_size[1]}.npy"
        if full_cache.exists():
            full_images = np.load(full_cache)
        else:
            full_images = render_views(
                positions=positions,
                scales=scales_linear,
                rotations_quat=rotations,
                opacities=opacities_alpha,
                colors_sh=colors,
                poses=test_poses,
                image_size=image_size,
            )
            np.save(full_cache, full_images)

        scores = lightgaussian_importance(
            positions=positions,
            scales_raw=scales_raw,
            rotations=rotations,
            opacities_raw=opacities_raw,
            colors_sh=colors,
            poses=train_poses,
            image_size=image_size,
        )
        mask = _topk_mask(scores, KEEP_RATIO)
        pruned = render_views(
            positions=positions[mask],
            scales=scales_linear[mask],
            rotations_quat=rotations[mask],
            opacities=opacities_alpha[mask],
            colors_sh=colors[mask],
            poses=test_poses,
            image_size=image_size,
        )
        psnrs = [psnr(full_images[i], pruned[i]) for i in range(len(test_poses))]
        mean_psnr = float(np.mean(psnrs))
        lg_rows.append(
            {
                "scene": scene,
                "capture": CAPTURE,
                "method": "lightgaussian",
                "keep_ratio": KEEP_RATIO,
                "mean_psnr": mean_psnr,
                "n_train_poses": len(train_poses),
            }
        )
        print(f"[ok] {scene} sparse lightgaussian mean_psnr={mean_psnr:.6f}")

    merged = pd.DataFrame(baseline_rows + lg_rows, columns=[
        "scene", "capture", "method", "keep_ratio", "mean_psnr", "n_train_poses"
    ])
    merged = merged.sort_values(["scene", "capture", "method"]).reset_index(drop=True)

    # Heuristic sanity check requested by reviewer-facing note.
    for scene in SCENES:
        s = merged[(merged["scene"] == scene) & (merged["capture"] == CAPTURE)]
        if len(s) == 0:
            continue
        lg = s[s["method"] == "lightgaussian"]
        vis = s[s["method"] == "visibility"]
        v5 = s[s["method"] == "path_aware_v5_linear_falloff"]
        if len(lg) and len(vis) and len(v5):
            lg_v = float(lg["mean_psnr"].iloc[0])
            vis_v = float(vis["mean_psnr"].iloc[0])
            v5_v = float(v5["mean_psnr"].iloc[0])
            if lg_v >= v5_v:
                print(f"[warn] {scene}: lightgaussian ({lg_v:.4f}) >= v5 ({v5_v:.4f})")
            elif lg_v < vis_v:
                print(f"[warn] {scene}: lightgaussian ({lg_v:.4f}) < visibility ({vis_v:.4f})")

    out_csv = out_dir / "lightgaussian_comparison.csv"
    merged.to_csv(out_csv, index=False)
    print(out_csv.as_posix())


if __name__ == "__main__":
    main()
