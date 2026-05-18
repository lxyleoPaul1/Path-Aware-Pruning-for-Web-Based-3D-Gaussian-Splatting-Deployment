from __future__ import annotations

import subprocess
import time
from pathlib import Path
import shutil

import pandas as pd


def test_run_effect_size_fixture_under_30s(tmp_path) -> None:
    project_root = Path(__file__).resolve().parents[1]
    script = project_root / "scripts" / "run_effect_size.py"
    fixture_ply = project_root / "data" / "fixtures" / "fixture_scene.ply"
    fixture_poses = project_root / "data" / "fixtures" / "fixture_poses.json"
    out_dir = tmp_path / "out"
    data_root = tmp_path / "mipnerf360"
    kitchen_dir = data_root / "kitchen"
    kitchen_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(fixture_ply, kitchen_dir / "point_cloud.ply")
    shutil.copy2(fixture_poses, kitchen_dir / "poses_train.json")
    shutil.copy2(fixture_poses, kitchen_dir / "poses_test.json")

    t0 = time.perf_counter()
    result = subprocess.run(
        [
            "uv",
            "run",
            "python",
            str(script),
            "--scene",
            "kitchen",
            "--width",
            "320",
            "--height",
            "180",
            "--data-root",
            str(data_root),
            "--output-dir",
            str(out_dir),
        ],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
    )
    elapsed = time.perf_counter() - t0

    csv_path = out_dir / "effect_size_kitchen.csv"
    plot_path = out_dir / "effect_size_summary.png"
    assert csv_path.exists(), result.stdout + "\n" + result.stderr
    assert plot_path.exists(), result.stdout + "\n" + result.stderr

    df = pd.read_csv(csv_path)
    assert len(df) == 12  # 3 keep ratios * 4 methods
    assert {"scene", "keep_ratio", "method", "mean_psnr", "mean_ssim", "mean_lpips", "per_pose_psnr"} <= set(df.columns)
    assert (out_dir / "lambda_sweep_kitchen.csv").exists()
    assert elapsed < 30.0, f"script elapsed={elapsed:.2f}s, expected <30s"

