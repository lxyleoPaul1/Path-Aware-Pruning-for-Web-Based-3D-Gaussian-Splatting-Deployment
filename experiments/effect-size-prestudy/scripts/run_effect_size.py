from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.baselines import random_pruning, visibility_pruning
from src.io import load_ply
from src.metrics import lpips_distance, psnr, ssim
from src.pruning import (
    path_aware_importance,
    path_aware_v5_linear_falloff,
    path_aware_v5_pure_sum,
    path_aware_v5_sqrt_clamp,
    path_aware_v5_weighted_sum,
)
from src.raster_importance import raster_based_importance
from src.render import render_views


SCENES = ["kitchen", "room", "counter", "truck", "train"]
KEEP_RATIOS = [0.7, 0.5, 0.3]
METHODS = [
    "random",
    "visibility",
    "path_aware_v5_linear_falloff",
    "path_aware_v5_pure_sum",
    "path_aware_v5_sqrt_clamp",
    "path_aware_v5_weighted_sum",
    "combined_0.7",
    "raster_importance",
]
LAMBDA_SWEEP = [0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]
BASE_SEED = 20260517
DEFAULT_SAFEGUARD_RATIO = 0.02

# Deployment-size model for PlayCanvas/SOG-style web delivery.
# File size is an estimated compressed transfer/storage payload. Runtime VRAM is
# estimated from resident RGBA8 GPU textures after WebP/SOG decode, with a
# safety factor for padding, upload staging, and conservative mobile embedded
# browser memory reclamation behavior.
SOG_FILE_BYTES_PER_SPLAT = 18.0
SOG_FILE_FIXED_OVERHEAD_BYTES = 256 * 1024
SOG_RUNTIME_TEXTURE_COUNT = 5
SOG_RUNTIME_BYTES_PER_TEXEL = 4
SOG_RUNTIME_VRAM_SAFETY_FACTOR = 1.35


def _sog_texture_extent(num_gaussians: int) -> tuple[int, int]:
    n = max(1, int(num_gaussians))
    width = int(math.ceil(math.sqrt(n) / 4) * 4)
    height = int(math.ceil(n / width / 4) * 4)
    return width, height


def estimate_deployment_metrics(num_gaussians: int) -> tuple[float, float]:
    """Estimate SOG transfer size and runtime GPU memory footprint in MiB."""
    n = max(0, int(num_gaussians))
    file_bytes = SOG_FILE_FIXED_OVERHEAD_BYTES + n * SOG_FILE_BYTES_PER_SPLAT
    width, height = _sog_texture_extent(n)
    resident_texture_bytes = width * height * SOG_RUNTIME_TEXTURE_COUNT * SOG_RUNTIME_BYTES_PER_TEXEL
    vram_bytes = resident_texture_bytes * SOG_RUNTIME_VRAM_SAFETY_FACTOR
    mib = 1024.0 * 1024.0
    return float(file_bytes / mib), float(vram_bytes / mib)


def _with_deployment_metrics(df: pd.DataFrame) -> pd.DataFrame:
    if len(df) == 0 or "kept_count" not in df.columns:
        return df
    out = df.copy()
    if "file_size_mb" not in out.columns:
        out["file_size_mb"] = np.nan
    if "estimated_vram_mb" not in out.columns:
        out["estimated_vram_mb"] = np.nan
    for idx, kept in out["kept_count"].items():
        if pd.isna(kept):
            continue
        file_mb, vram_mb = estimate_deployment_metrics(int(kept))
        out.at[idx, "file_size_mb"] = file_mb
        out.at[idx, "estimated_vram_mb"] = vram_mb
    return out


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _load_poses(path: Path) -> tuple[list[dict], float, float, float]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    poses = payload["poses"]
    near = float(payload.get("near_plane", payload.get("near", 0.1)))
    far = float(payload.get("far_plane", payload.get("far", 150.0)))
    aspect = float(payload.get("aspect_ratio", payload.get("aspect", 16.0 / 9.0)))
    return poses, near, far, aspect


def _cache_key(input_path: Path, poses_train_path: Path, poses_test_path: Path, image_size: tuple[int, int]) -> str:
    h = hashlib.sha256()
    h.update(str(input_path.resolve()).encode("utf-8"))
    h.update(str(input_path.stat().st_mtime_ns).encode("utf-8"))
    h.update(str(input_path.stat().st_size).encode("utf-8"))
    h.update(str(poses_train_path.resolve()).encode("utf-8"))
    h.update(poses_train_path.read_bytes())
    h.update(str(poses_test_path.resolve()).encode("utf-8"))
    h.update(poses_test_path.read_bytes())
    h.update(str(image_size).encode("utf-8"))
    return h.hexdigest()[:16]


def _mask_hash(mask: np.ndarray) -> str:
    packed = np.packbits(mask.astype(np.uint8))
    return hashlib.sha256(packed.tobytes()).hexdigest()[:16]


def _topk_mask(scores: np.ndarray, keep_ratio: float, safeguard_ratio: float = 0.0, seed: int = 0) -> np.ndarray:
    n = scores.shape[0]
    keep_count = int(math.ceil(keep_ratio * n))
    keep_count = max(0, min(n, keep_count))
    order = np.argsort(scores)[::-1]
    mask = np.zeros(n, dtype=bool)
    mask[order[:keep_count]] = True
    if safeguard_ratio > 0.0 and keep_count < n:
        dropped = order[keep_count:]
        extra_count = int(math.ceil(float(safeguard_ratio) * dropped.shape[0]))
        extra_count = max(0, min(int(dropped.shape[0]), extra_count))
        if extra_count > 0:
            rng = np.random.default_rng(seed)
            extra = rng.choice(dropped, size=extra_count, replace=False)
            mask[extra] = True
    return mask


def _compute_path_scores(
    positions: np.ndarray,
    scales_raw: np.ndarray,
    opacities_raw: np.ndarray,
    train_poses: list[dict],
    near: float,
    far: float,
    aspect: float,
) -> np.ndarray:
    return path_aware_importance(
        positions=positions,
        scales=scales_raw,
        opacities=opacities_raw,
        poses=train_poses,
        near=near,
        far=far,
        aspect=aspect,
    )


def _compute_visibility_scores(scales_linear: np.ndarray, opacities_alpha: np.ndarray) -> np.ndarray:
    vol = (4.0 / 3.0) * math.pi * np.abs(scales_linear[:, 0] * scales_linear[:, 1] * scales_linear[:, 2])
    return opacities_alpha * vol


def _compute_mask(
    method: str,
    keep_ratio: float,
    positions: np.ndarray,
    scales_raw: np.ndarray,
    opacities_raw: np.ndarray,
    scales_linear: np.ndarray,
    opacities_alpha: np.ndarray,
    train_poses: list[dict],
    near: float,
    far: float,
    aspect: float,
    path_near: float,
    path_far: float,
    path_aspect: float,
    method_seed: int,
    combined_lambda: float = 0.7,
    safeguard_ratio: float = 0.0,
) -> np.ndarray:
    if method == "random":
        return random_pruning(len(positions), keep_ratio, seed=method_seed)
    if method == "visibility":
        return visibility_pruning(scales_linear, opacities_alpha, keep_ratio)
    if method == "path_aware":
        path_scores = _compute_path_scores(positions, scales_raw, opacities_raw, train_poses, near, far, aspect)
        return _topk_mask(path_scores, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "path_aware_v5_linear_falloff":
        path_scores = path_aware_v5_linear_falloff(
            positions=positions,
            scales=scales_raw,
            opacities=opacities_raw,
            rotations=np.zeros((positions.shape[0], 4), dtype=np.float32),
            poses=train_poses,
            near=path_near,
            far=path_far,
            aspect=path_aspect,
        )
        return _topk_mask(path_scores, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "path_aware_v5_pure_sum":
        path_scores = path_aware_v5_pure_sum(
            positions=positions,
            scales=scales_raw,
            opacities=opacities_raw,
            rotations=np.zeros((positions.shape[0], 4), dtype=np.float32),
            poses=train_poses,
            near=path_near,
            far=path_far,
            aspect=path_aspect,
        )
        return _topk_mask(path_scores, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "path_aware_v5_sqrt_clamp":
        path_scores = path_aware_v5_sqrt_clamp(
            positions=positions,
            scales=scales_raw,
            opacities=opacities_raw,
            rotations=np.zeros((positions.shape[0], 4), dtype=np.float32),
            poses=train_poses,
            near=path_near,
            far=path_far,
            aspect=path_aspect,
            hit_clamp=30,
        )
        return _topk_mask(path_scores, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "path_aware_v5_weighted_sum":
        path_scores = path_aware_v5_weighted_sum(
            positions=positions,
            scales=scales_raw,
            opacities=opacities_raw,
            rotations=np.zeros((positions.shape[0], 4), dtype=np.float32),
            poses=train_poses,
            near=path_near,
            far=path_far,
            aspect=path_aspect,
            beta=0.1,
        )
        return _topk_mask(path_scores, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "combined":
        path_scores = _compute_path_scores(positions, scales_raw, opacities_raw, train_poses, near, far, aspect)
        vis_scores = _compute_visibility_scores(scales_linear, opacities_alpha)
        p = (path_scores - path_scores.min()) / (np.ptp(path_scores) + 1e-12)
        v = (vis_scores - vis_scores.min()) / (np.ptp(vis_scores) + 1e-12)
        combo = combined_lambda * p + (1.0 - combined_lambda) * v
        return _topk_mask(combo, keep_ratio, safeguard_ratio=safeguard_ratio, seed=method_seed)
    if method == "combined_0.7":
        return _compute_mask(
            method="combined",
            keep_ratio=keep_ratio,
            positions=positions,
            scales_raw=scales_raw,
            opacities_raw=opacities_raw,
            scales_linear=scales_linear,
            opacities_alpha=opacities_alpha,
            train_poses=train_poses,
            near=near,
            far=far,
            aspect=aspect,
            path_near=path_near,
            path_far=path_far,
            path_aspect=path_aspect,
            method_seed=method_seed,
            combined_lambda=0.7,
            safeguard_ratio=safeguard_ratio,
        )
    raise ValueError(f"unknown method: {method}")


def _resolve_scene_dir(data_root: Path, scene_name: str) -> Path:
    candidates = [
        data_root / "mipnerf360" / scene_name,
        data_root / "tandt" / scene_name,
        data_root / scene_name,
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]


def _evaluate_combo(
    positions: np.ndarray,
    scales_linear: np.ndarray,
    rotations: np.ndarray,
    opacities_alpha: np.ndarray,
    colors: np.ndarray,
    mask: np.ndarray,
    test_poses: list[dict],
    image_size: tuple[int, int],
    full_images: np.ndarray,
) -> tuple[float, float, float, list[float], np.ndarray]:
    pruned_images = render_views(
        positions=positions[mask],
        scales=scales_linear[mask],
        rotations_quat=rotations[mask],
        opacities=opacities_alpha[mask],
        colors_sh=colors[mask],
        poses=test_poses,
        image_size=image_size,
    )
    per_pose_psnr: list[float] = []
    per_pose_ssim: list[float] = []
    per_pose_lpips: list[float] = []
    for i in range(len(test_poses)):
        gt = full_images[i]
        pred = pruned_images[i]
        per_pose_psnr.append(psnr(gt, pred))
        per_pose_ssim.append(ssim(gt, pred))
        per_pose_lpips.append(lpips_distance(gt, pred))
    return (
        float(np.mean(per_pose_psnr)),
        float(np.mean(per_pose_ssim)),
        float(np.mean(per_pose_lpips)),
        [float(x) for x in per_pose_psnr],
        pruned_images,
    )


def _save_lambda_plot(df: pd.DataFrame, out_png: Path) -> None:
    fig, ax = plt.subplots(figsize=(6.5, 4.2))
    sub = df.sort_values("lambda")
    ax.plot(sub["lambda"], sub["mean_psnr"], marker="o")
    ax.set_xlabel("lambda")
    ax.set_ylabel("mean_psnr")
    ax.set_title("Lambda sweep (kitchen, keep_ratio=0.5)")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    plt.close(fig)


def _save_summary_plot(df_all: pd.DataFrame, out_png: Path) -> None:
    sub = df_all[np.isclose(df_all["keep_ratio"], 0.5)]
    methods = ["random", "visibility", "path_aware_v5_linear_falloff", "combined_0.7", "raster_importance"]
    scenes = [s for s in SCENES if s in set(sub["scene"])]
    if not scenes:
        return
    x = np.arange(len(scenes))
    width = 0.18
    fig, ax = plt.subplots(figsize=(8.4, 4.6))
    for i, method in enumerate(methods):
        vals = []
        for scene in scenes:
            m = sub[(sub["scene"] == scene) & (sub["method"] == method)]
            vals.append(float(m["mean_psnr"].iloc[0]) if len(m) else np.nan)
        ax.bar(x + (i - 1.5) * width, vals, width=width, label=method)
    ax.set_xticks(x)
    ax.set_xticklabels(scenes)
    ax.set_ylabel("mean_psnr")
    ax.set_title("Effect size summary at keep_ratio=0.5")
    ax.legend()
    ax.grid(True, axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    plt.close(fig)


def _print_checkpoint(df_all: pd.DataFrame, df_lambda: pd.DataFrame) -> None:
    print("\n=== 6/15 CHECKPOINT DECISION ===")
    print("Per scene (keep_ratio=0.5):")
    lines = []
    for scene in SCENES:
        sub = df_all[(df_all["scene"] == scene) & (np.isclose(df_all["keep_ratio"], 0.5))]
        if len(sub) == 0:
            lines.append(f"  {scene}:     missing")
            continue
        vals = {}
        for m in ["random", "visibility", "path_aware", "combined"]:
            msub = sub[sub["method"] == m]
            vals[m] = float(msub["mean_psnr"].iloc[0]) if len(msub) else float("nan")
        lines.append(
            f"  {scene:<8} random={vals['random']:.1f}  vis={vals['visibility']:.1f}  "
            f"path={vals['path_aware']:.1f}  combined={vals['combined']:.1f}"
        )
    for line in lines:
        print(line)

    keep = df_all[np.isclose(df_all["keep_ratio"], 0.5)]
    gaps_path = []
    gaps_combined = []
    for scene in SCENES:
        s = keep[keep["scene"] == scene]
        if len(s) == 0:
            continue
        vis_rows = s[s["method"] == "visibility"]
        path_rows = s[s["method"] == "path_aware"]
        if len(path_rows) == 0:
            path_rows = s[s["method"] == "path_aware_v5_linear_falloff"]
        comb_rows = s[s["method"] == "combined"]
        if len(comb_rows) == 0:
            comb_rows = s[s["method"] == "combined_0.7"]
        if len(vis_rows) and len(path_rows):
            vis = float(vis_rows["mean_psnr"].iloc[0])
            path = float(path_rows["mean_psnr"].iloc[0])
            gaps_path.append(path - vis)
        if len(vis_rows) and len(comb_rows):
            vis = float(vis_rows["mean_psnr"].iloc[0])
            comb = float(comb_rows["mean_psnr"].iloc[0])
            gaps_combined.append(comb - vis)
    mean_gap_path = float(np.mean(gaps_path)) if gaps_path else float("nan")
    mean_gap_combined = float(np.mean(gaps_combined)) if gaps_combined else float("nan")

    best_lambda = float(df_lambda.sort_values("mean_psnr", ascending=False)["lambda"].iloc[0]) if len(df_lambda) else float("nan")

    print(f"Mean gap (path - vis):     {mean_gap_path:.1f} dB")
    print(f"Mean gap (combined - vis): {mean_gap_combined:.1f} dB")
    print(f"Best lambda (kitchen):     {best_lambda:.1f}")
    print("\nDecision:")
    if mean_gap_combined >= 1.5:
        print('  "PROCEED with full paper"')
    elif mean_gap_combined >= 1.0:
        print('  "MARGINAL — discuss"')
    else:
        print('  "DOWNGRADE to short paper"')


def main() -> None:
    parser = argparse.ArgumentParser(description="Run effect-size evaluation with resume support.")
    parser.add_argument("--scene", default="all", help='Single scene name (e.g. "truck") or "all".')
    parser.add_argument("--scenes", nargs="+", default=None, help='Multiple scenes (e.g. --scenes truck train). Overrides --scene.')
    parser.add_argument("--width", type=int, default=800)
    parser.add_argument("--height", type=int, default=450)
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--data-root", type=Path, default=Path("data"))
    parser.add_argument("--methods", nargs="+", default=METHODS)
    parser.add_argument("--keep_ratios", nargs="+", type=float, default=KEEP_RATIOS)
    parser.add_argument(
        "--train-poses-suffix",
        default="",
        help="Suffix for train poses file, e.g. '_trajectory_half' -> poses_train_trajectory_half.json",
    )
    parser.add_argument(
        "--test-poses-suffix",
        default="",
        help="Suffix for test poses file, e.g. '_trajectory_half' -> poses_test_trajectory_half.json",
    )
    parser.add_argument(
        "--output-suffix",
        default="",
        help="Suffix for output CSV/PNG names, e.g. '_freeroam' -> effect_size_all_freeroam.csv",
    )
    parser.add_argument(
        "--path-use-pose-meta",
        action="store_true",
        help="Use near/far/aspect from poses json for path-aware methods (legacy behavior).",
    )
    parser.add_argument("--path-near", type=float, default=0.1, help="Path-aware near plane when not using pose meta.")
    parser.add_argument("--path-far", type=float, default=150.0, help="Path-aware far plane when not using pose meta.")
    parser.add_argument("--path-aspect", type=float, default=16.0 / 9.0, help="Path-aware aspect when not using pose meta.")
    parser.add_argument(
        "--safeguard-ratio",
        type=float,
        default=DEFAULT_SAFEGUARD_RATIO,
        help="Deterministically retain this fraction of non-top-k splats for background coverage.",
    )
    parser.add_argument("--no-lambda-sweep", action="store_true")
    parser.add_argument("--force-scene-recompute", action="store_true")
    args = parser.parse_args()
    if not 0.0 <= args.safeguard_ratio <= 0.05:
        raise ValueError("--safeguard-ratio must be in [0, 0.05]")

    out_dir = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_dir / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    image_size = (args.width, args.height)
    if args.scenes:
        selected_scenes = args.scenes
    else:
        selected_scenes = SCENES if args.scene == "all" else [args.scene]
    selected_methods = args.methods
    selected_keep_ratios = args.keep_ratios
    train_poses_suffix = str(args.train_poses_suffix or "")
    test_poses_suffix = str(args.test_poses_suffix or "")
    output_suffix = str(args.output_suffix or "")

    all_scene_frames: list[pd.DataFrame] = []
    for scene_name in selected_scenes:
        scene_dir = _resolve_scene_dir(args.data_root, scene_name)
        ply_path = scene_dir / "point_cloud.ply"
        poses_train_path = scene_dir / f"poses_train{train_poses_suffix}.json"
        poses_test_path = scene_dir / f"poses_test{test_poses_suffix}.json"
        if not ply_path.exists() or not poses_train_path.exists() or not poses_test_path.exists():
            print(f"[skip] {scene_name}: missing point_cloud.ply or poses jsons")
            continue

        scene_data = load_ply(ply_path)
        positions = scene_data["positions"].astype(np.float32)
        scales_raw = scene_data["scales"].astype(np.float32)
        rotations = scene_data["rotations"].astype(np.float32)
        opacities_raw = scene_data["opacities"].astype(np.float32)
        colors = scene_data["colors"].astype(np.float32)
        scales_linear = np.exp(scales_raw).astype(np.float32)
        opacities_alpha = _sigmoid(opacities_raw).astype(np.float32)

        train_poses, near, far, aspect = _load_poses(poses_train_path)
        test_poses, _, _, _ = _load_poses(poses_test_path)
        if args.path_use_pose_meta:
            path_near, path_far, path_aspect = near, far, aspect
        else:
            path_near = float(args.path_near)
            path_far = float(args.path_far)
            path_aspect = float(args.path_aspect)

        key = _cache_key(ply_path, poses_train_path, poses_test_path, image_size)
        full_cache_path = cache_dir / f"{scene_name}_full_test_render_{key}.npy"
        if full_cache_path.exists():
            full_images = np.load(full_cache_path)
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
            np.save(full_cache_path, full_images)

        scene_csv = out_dir / f"effect_size_{scene_name}{output_suffix}.csv"
        if scene_csv.exists():
            df_scene = pd.read_csv(scene_csv)
        else:
            df_scene = pd.DataFrame(
                columns=[
                    "scene",
                    "keep_ratio",
                    "method",
                    "lambda",
                    "mean_psnr",
                    "mean_ssim",
                    "mean_lpips",
                    "per_pose_psnr",
                    "kept_count",
                    "file_size_mb",
                    "estimated_vram_mb",
                    "mask_hash",
                    "path_use_pose_meta",
                    "path_near",
                    "path_far",
                    "path_aspect",
                ]
            )
        if args.force_scene_recompute and len(df_scene) > 0:
            df_scene = df_scene.iloc[0:0].copy()
        df_scene = _with_deployment_metrics(df_scene)
        df_scene.to_csv(scene_csv, index=False)

        total = len(selected_keep_ratios) * len(selected_methods)
        pbar = tqdm(total=total, desc=f"{scene_name} grid", unit="combo")
        for r_idx, keep_ratio in enumerate(selected_keep_ratios):
            for m_idx, method in enumerate(selected_methods):
                if method in ("combined", "combined_0.7"):
                    row_exists = len(
                        df_scene[
                            (np.isclose(df_scene["keep_ratio"], keep_ratio))
                            & (df_scene["method"] == method)
                            & (np.isclose(df_scene["lambda"], 0.7))
                        ]
                    ) > 0
                else:
                    row_exists = len(
                        df_scene[
                            (np.isclose(df_scene["keep_ratio"], keep_ratio))
                            & (df_scene["method"] == method)
                        ]
                    ) > 0
                if row_exists:
                    pbar.update(1)
                    continue

                seed = BASE_SEED + r_idx * 100 + m_idx
                lam = 0.7 if method in ("combined", "combined_0.7") else math.nan
                if method == "raster_importance":
                    scores = raster_based_importance(
                        positions=positions,
                        scales_raw=scales_raw,
                        rotations=rotations,
                        opacities_raw=opacities_raw,
                        colors_sh=colors,
                        poses=train_poses,
                        image_size=image_size,
                    )
                    mask = _topk_mask(scores, keep_ratio)
                else:
                    mask = _compute_mask(
                        method=method,
                        keep_ratio=keep_ratio,
                        positions=positions,
                        scales_raw=scales_raw,
                        opacities_raw=opacities_raw,
                        scales_linear=scales_linear,
                        opacities_alpha=opacities_alpha,
                        train_poses=train_poses,
                        near=near,
                        far=far,
                        aspect=aspect,
                        path_near=path_near,
                        path_far=path_far,
                        path_aspect=path_aspect,
                        method_seed=seed,
                        combined_lambda=0.7,
                        safeguard_ratio=float(args.safeguard_ratio),
                    )
                kept_count = int(mask.sum())
                file_size_mb, estimated_vram_mb = estimate_deployment_metrics(kept_count)
                topk_expected = int(math.ceil(keep_ratio * len(mask)))
                if method not in ("random", "visibility", "raster_importance"):
                    expected = topk_expected + int(math.ceil(float(args.safeguard_ratio) * max(0, len(mask) - topk_expected)))
                else:
                    expected = topk_expected
                if abs(kept_count - expected) > 1:
                    raise RuntimeError(
                        f"[{scene_name}] kept_count mismatch for {method}@{keep_ratio}: "
                        f"got {kept_count}, expected ~{expected}"
                    )
                mh = _mask_hash(mask)

                mean_psnr, mean_ssim, mean_lpips, per_pose_psnr, pruned_images = _evaluate_combo(
                    positions=positions,
                    scales_linear=scales_linear,
                    rotations=rotations,
                    opacities_alpha=opacities_alpha,
                    colors=colors,
                    mask=mask,
                    test_poses=test_poses,
                    image_size=image_size,
                    full_images=full_images,
                )
                if keep_ratio < 0.999 and np.array_equal(pruned_images, full_images):
                    raise RuntimeError(
                        f"[{scene_name}] pruned_images identical to full_images for {method}@{keep_ratio}; "
                        "mask application or renderer path likely broken."
                    )
                df_scene = pd.concat(
                    [
                        df_scene,
                        pd.DataFrame(
                            [
                                {
                                    "scene": scene_name,
                                    "keep_ratio": keep_ratio,
                                    "method": method,
                                    "lambda": lam,
                                    "mean_psnr": mean_psnr,
                                    "mean_ssim": mean_ssim,
                                    "mean_lpips": mean_lpips,
                                    "per_pose_psnr": json.dumps(per_pose_psnr),
                                    "kept_count": kept_count,
                                    "file_size_mb": file_size_mb,
                                    "estimated_vram_mb": estimated_vram_mb,
                                    "mask_hash": mh,
                                    "path_use_pose_meta": bool(args.path_use_pose_meta),
                                    "path_near": float(path_near),
                                    "path_far": float(path_far),
                                    "path_aspect": float(path_aspect),
                                }
                            ]
                        ),
                    ],
                    ignore_index=True,
                )
                df_scene.to_csv(scene_csv, index=False)
                pbar.update(1)
        pbar.close()

        # Kitchen lambda sweep at keep_ratio=0.5.
        if scene_name == "kitchen" and not args.no_lambda_sweep:
            lambda_csv = out_dir / f"lambda_sweep_kitchen{output_suffix}.csv"
            if lambda_csv.exists():
                df_lambda = pd.read_csv(lambda_csv)
            else:
                df_lambda = pd.DataFrame(
                    columns=[
                        "scene",
                        "keep_ratio",
                        "method",
                        "lambda",
                        "mean_psnr",
                        "mean_ssim",
                        "mean_lpips",
                        "per_pose_psnr",
                        "kept_count",
                        "file_size_mb",
                        "estimated_vram_mb",
                        "mask_hash",
                        "path_use_pose_meta",
                        "path_near",
                        "path_far",
                        "path_aspect",
                    ]
                )
            if args.force_scene_recompute and len(df_lambda) > 0:
                df_lambda = df_lambda.iloc[0:0].copy()
            df_lambda = _with_deployment_metrics(df_lambda)
            df_lambda.to_csv(lambda_csv, index=False)
            lbar = tqdm(total=len(LAMBDA_SWEEP), desc="kitchen lambda sweep", unit="lambda")
            for idx, lam in enumerate(LAMBDA_SWEEP):
                exists = len(df_lambda[np.isclose(df_lambda["lambda"], lam)]) > 0
                if exists:
                    lbar.update(1)
                    continue
                mask = _compute_mask(
                    method="combined",
                    keep_ratio=0.5,
                    positions=positions,
                    scales_raw=scales_raw,
                    opacities_raw=opacities_raw,
                    scales_linear=scales_linear,
                    opacities_alpha=opacities_alpha,
                    train_poses=train_poses,
                    near=near,
                    far=far,
                    aspect=aspect,
                    path_near=path_near,
                    path_far=path_far,
                    path_aspect=path_aspect,
                    method_seed=BASE_SEED + 5000 + idx,
                    combined_lambda=lam,
                    safeguard_ratio=float(args.safeguard_ratio),
                )
                kept_count = int(mask.sum())
                file_size_mb, estimated_vram_mb = estimate_deployment_metrics(kept_count)
                mh = _mask_hash(mask)
                mean_psnr, mean_ssim, mean_lpips, per_pose_psnr, pruned_images = _evaluate_combo(
                    positions=positions,
                    scales_linear=scales_linear,
                    rotations=rotations,
                    opacities_alpha=opacities_alpha,
                    colors=colors,
                    mask=mask,
                    test_poses=test_poses,
                    image_size=image_size,
                    full_images=full_images,
                )
                if np.array_equal(pruned_images, full_images):
                    raise RuntimeError(
                        f"[{scene_name}] lambda={lam} produced image identical to full scene at keep_ratio=0.5"
                    )
                df_lambda = pd.concat(
                    [
                        df_lambda,
                        pd.DataFrame(
                            [
                                {
                                    "scene": scene_name,
                                    "keep_ratio": 0.5,
                                    "method": "combined",
                                    "lambda": lam,
                                    "mean_psnr": mean_psnr,
                                    "mean_ssim": mean_ssim,
                                    "mean_lpips": mean_lpips,
                                    "per_pose_psnr": json.dumps(per_pose_psnr),
                                    "kept_count": kept_count,
                                    "file_size_mb": file_size_mb,
                                    "estimated_vram_mb": estimated_vram_mb,
                                    "mask_hash": mh,
                                    "path_use_pose_meta": bool(args.path_use_pose_meta),
                                    "path_near": float(path_near),
                                    "path_far": float(path_far),
                                    "path_aspect": float(path_aspect),
                                }
                            ]
                        ),
                    ],
                    ignore_index=True,
                )
                df_lambda.to_csv(lambda_csv, index=False)
                lbar.update(1)
            lbar.close()
            _save_lambda_plot(df_lambda, out_dir / "lambda_sweep_kitchen.png")

        all_scene_frames.append(df_scene)

    if all_scene_frames:
        df_all = _with_deployment_metrics(pd.concat(all_scene_frames, ignore_index=True))
        all_csv = out_dir / f"effect_size_all{output_suffix}.csv"
        summary_png = out_dir / f"effect_size_summary{output_suffix}.png"
        df_all.to_csv(all_csv, index=False)
        _save_summary_plot(df_all, summary_png)
        lambda_csv = out_dir / f"lambda_sweep_kitchen{output_suffix}.csv"
        df_lambda = pd.read_csv(lambda_csv) if lambda_csv.exists() else pd.DataFrame()
        _print_checkpoint(df_all, df_lambda)
        print(all_csv.as_posix())
        print(summary_png.as_posix())
    else:
        print("No scenes processed. Check dataset paths under data/mipnerf360/<scene>/")


if __name__ == "__main__":
    main()

