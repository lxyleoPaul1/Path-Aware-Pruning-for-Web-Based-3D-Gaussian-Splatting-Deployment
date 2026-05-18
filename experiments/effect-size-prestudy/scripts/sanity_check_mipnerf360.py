from __future__ import annotations

from dataclasses import dataclass
import itertools
import json
from pathlib import Path
import subprocess
import sys
from typing import Any

import imageio.v3 as iio
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.read_write_model import read_cameras_binary, read_images_binary, qvec2rotmat
from src.metrics import psnr
from src.pruning import _rotation_matrix_xyz_deg


SPLAT_CLI = ROOT.parents[2] / "splat-transform-fork" / "bin" / "cli.mjs"
CAPTURE_SCRIPT = ROOT / "scripts" / "capture_viewer_canvas.mjs"
SCENE_NAME = "kitchen"
SCENE_DIR = ROOT / "data" / "mipnerf360" / SCENE_NAME
SANITY_OUT = ROOT / "output" / "sanity"
IMAGE_SIZE = (800, 450)


@dataclass
class PoseRecord:
    image_name: str
    position: np.ndarray
    rotation_euler_deg: np.ndarray
    fov_deg: float


def _load_scene_paths() -> tuple[Path, Path, Path]:
    poses_train = SCENE_DIR / "poses_train.json"
    cameras_bin = SCENE_DIR / "cameras.bin"
    images_bin = SCENE_DIR / "images.bin"
    if not poses_train.exists():
        raise FileNotFoundError(f"missing poses file: {poses_train}")
    if not cameras_bin.exists() or not images_bin.exists():
        raise FileNotFoundError("missing COLMAP model files (cameras.bin/images.bin)")

    ply_candidates = sorted(SCENE_DIR.glob("*.ply"))
    if not ply_candidates:
        raise FileNotFoundError(f"no .ply found under {SCENE_DIR}")
    return poses_train, cameras_bin, images_bin


def _pose_to_target(position: np.ndarray, euler_xyz_deg: np.ndarray) -> np.ndarray:
    r = _rotation_matrix_xyz_deg(euler_xyz_deg)
    forward = r[:, 2]
    return position + forward


def _colmap_ref_pose(image, camera) -> tuple[PoseRecord, np.ndarray]:
    r_cw = qvec2rotmat(np.asarray(image.qvec, dtype=np.float64))
    r_wc = r_cw.T
    c_world = -r_wc @ np.asarray(image.tvec, dtype=np.float64)
    fwd_world = r_wc[:, 2]
    # Convert to Euler so both render paths go through the same viewer settings fields.
    # The direction itself is taken from COLMAP reference matrix.
    euler = np.zeros(3, dtype=np.float64)
    # Store synthetic Euler from forward direction by constructing target-based orientation.
    # We only need position+target for viewer settings; euler value is not consumed for ref.
    fx = float(np.asarray(camera.params, dtype=np.float64)[0])
    fov = float(2.0 * np.degrees(np.arctan(float(camera.width) / (2.0 * fx))))
    rec = PoseRecord(
        image_name=image.name,
        position=c_world,
        rotation_euler_deg=euler,
        fov_deg=fov,
    )
    target = c_world + fwd_world
    return rec, target


def _write_viewer_settings(path: Path, position: np.ndarray, target: np.ndarray, fov_deg: float) -> None:
    payload = {
        "version": 2,
        "tonemapping": "none",
        "highPrecisionRendering": False,
        "background": {"color": [0.4, 0.4, 0.4]},
        "cameras": [
            {
                "initial": {
                    "position": [float(position[0]), float(position[1]), float(position[2])],
                    "target": [float(target[0]), float(target[1]), float(target[2])],
                    "fov": float(fov_deg),
                }
            }
        ],
        "startMode": "default",
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _render_with_viewer(ply_path: Path, settings_json: Path, html_out: Path, png_out: Path) -> None:
    subprocess.run(
        [
            "node",
            str(SPLAT_CLI),
            "-w",
            "-E",
            str(settings_json),
            str(ply_path),
            str(html_out),
        ],
        cwd=ROOT,
        check=True,
    )
    subprocess.run(
        ["node", str(CAPTURE_SCRIPT), str(html_out), str(png_out)],
        cwd=ROOT,
        check=True,
    )


def _make_compare(ours_png: Path, ref_png: Path, out_png: Path) -> float:
    ours = iio.imread(ours_png).astype(np.float32) / 255.0
    ref = iio.imread(ref_png).astype(np.float32) / 255.0
    value = psnr(ours, ref)
    side = np.concatenate([(ours * 255).astype(np.uint8), (ref * 255).astype(np.uint8)], axis=1)
    iio.imwrite(out_png, side)
    return value


def _try_all_sign_flips(
    pose: PoseRecord,
    ref_png: Path,
    ply_path: Path,
    pose_idx: int,
) -> tuple[list[tuple[tuple[int, int, int], float]], tuple[int, int, int] | None]:
    trials: list[tuple[tuple[int, int, int], float]] = []
    hit_variant: tuple[int, int, int] | None = None
    for signs in itertools.product([-1, 1], repeat=3):
        sign_arr = np.asarray(signs, dtype=np.float64)
        target = _pose_to_target(pose.position, pose.rotation_euler_deg * sign_arr)
        s_json = SANITY_OUT / f"kitchen_pose{pose_idx}_flip_{signs[0]}_{signs[1]}_{signs[2]}.json"
        s_html = SANITY_OUT / f"kitchen_pose{pose_idx}_flip_{signs[0]}_{signs[1]}_{signs[2]}.html"
        s_png = SANITY_OUT / f"kitchen_pose{pose_idx}_flip_{signs[0]}_{signs[1]}_{signs[2]}.png"
        _write_viewer_settings(s_json, pose.position, target, pose.fov_deg)
        _render_with_viewer(ply_path, s_json, s_html, s_png)
        ours = iio.imread(s_png).astype(np.float32) / 255.0
        ref = iio.imread(ref_png).astype(np.float32) / 255.0
        score = psnr(ours, ref)
        trials.append((signs, float(score)))
        if hit_variant is None and score > 30.0:
            hit_variant = signs
    return trials, hit_variant


def _update_convert_script(best_signs: tuple[int, int, int]) -> bool:
    path = ROOT / "scripts" / "convert_colmap_to_poses.py"
    text = path.read_text(encoding="utf-8")
    import re

    new_line = f"EULER_SIGN_FLIP = np.array([{float(best_signs[0])}, {float(best_signs[1])}, {float(best_signs[2])}], dtype=np.float64)"
    replaced, n = re.subn(
        r"EULER_SIGN_FLIP\s*=\s*np\.array\(\[[^\]]+\],\s*dtype=np\.float64\)",
        new_line,
        text,
        count=1,
    )
    if n == 0:
        return False
    path.write_text(replaced, encoding="utf-8")
    return True


def main() -> None:
    SANITY_OUT.mkdir(parents=True, exist_ok=True)

    poses_train_path, cameras_bin, images_bin = _load_scene_paths()
    pose_payload = json.loads(poses_train_path.read_text(encoding="utf-8"))
    poses = pose_payload["poses"]
    if len(poses) < 3:
        raise RuntimeError("poses_train.json has fewer than 3 poses")

    pick_indices = [0, len(poses) // 2, len(poses) - 1]
    selected = [poses[i] for i in pick_indices]

    cameras = read_cameras_binary(cameras_bin)
    images = read_images_binary(images_bin)
    image_by_name = {im.name: im for im in images.values()}

    ply_path = sorted(SCENE_DIR.glob("*.ply"))[0]
    psnr_values: list[float] = []

    print("Sanity check on scene:", SCENE_NAME)
    for local_idx, p in enumerate(selected):
        image_name = p["image_name"]
        ours_pose = PoseRecord(
            image_name=image_name,
            position=np.asarray(p["position"], dtype=np.float64),
            rotation_euler_deg=np.asarray(p["rotation_euler_deg"], dtype=np.float64),
            fov_deg=float(p.get("fov_degrees", p.get("fov_deg", 60.0))),
        )

        colmap_image = image_by_name[image_name]
        colmap_camera = cameras[colmap_image.camera_id]
        ref_pose, ref_target = _colmap_ref_pose(colmap_image, colmap_camera)

        ours_target = _pose_to_target(ours_pose.position, ours_pose.rotation_euler_deg)

        ours_json = SANITY_OUT / f"kitchen_pose{local_idx}_ours_settings.json"
        ours_html = SANITY_OUT / f"kitchen_pose{local_idx}_ours.html"
        ours_png = SANITY_OUT / f"kitchen_pose{local_idx}_ours.png"
        ref_json = SANITY_OUT / f"kitchen_pose{local_idx}_ref_settings.json"
        ref_html = SANITY_OUT / f"kitchen_pose{local_idx}_ref.html"
        ref_png = SANITY_OUT / f"kitchen_pose{local_idx}_ref.png"
        cmp_png = SANITY_OUT / f"kitchen_pose{local_idx}_compare.png"

        _write_viewer_settings(ours_json, ours_pose.position, ours_target, ours_pose.fov_deg)
        _write_viewer_settings(ref_json, ref_pose.position, ref_target, ref_pose.fov_deg)
        _render_with_viewer(ply_path, ours_json, ours_html, ours_png)
        _render_with_viewer(ply_path, ref_json, ref_html, ref_png)

        cur_psnr = _make_compare(ours_png, ref_png, cmp_png)
        psnr_values.append(cur_psnr)
        print(f"pose{local_idx} ({image_name}) PSNR ours-vs-ref: {cur_psnr:.2f} dB")

        if cur_psnr < 30.0:
            print("PSNR < 30 dB detected, trying 8 rotation-axis sign-flip variants:")
            trials, hit = _try_all_sign_flips(ours_pose, ref_png, ply_path, local_idx)
            for signs, score in trials:
                print(f"  flip {signs}: {score:.2f} dB")
            if hit is not None:
                print(f"first variant > 30 dB: {hit}")
                if _update_convert_script(hit):
                    print("convert_colmap_to_poses.py updated with new EULER_SIGN_FLIP.")
                else:
                    print("failed to update convert_colmap_to_poses.py automatically.")
            else:
                print("no sign-flip variant exceeded 30 dB")
            raise RuntimeError("coordinate system mismatch detected (PSNR < 30 dB). STOP.")

    print("All selected poses passed (>30 dB).")
    if min(psnr_values) <= 35.0:
        print("Warning: some poses are <= 35 dB; recommended to inspect compare images.")
    else:
        print("Expected quality met: all poses > 35 dB.")


if __name__ == "__main__":
    main()

