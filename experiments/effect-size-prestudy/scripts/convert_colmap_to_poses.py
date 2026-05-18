from __future__ import annotations

import argparse
from pathlib import Path
import json
import sys

import numpy as np
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.read_write_model import read_cameras_binary, read_images_binary, qvec2rotmat

# Axis-wise sign correction applied after Euler XYZ extraction.
# This keeps rotation matrices proper (det=+1) while allowing explicit
# convention calibration against downstream viewers.
EULER_SIGN_FLIP = np.array([1.0, 1.0, 1.0], dtype=np.float64)


def _build_pose_entry(image, camera, axis_transform_cv_to_pruning: np.ndarray) -> tuple[dict, np.ndarray]:
    # COLMAP image stores world->camera transform in OpenCV local camera axes:
    # +X right, +Y down, +Z forward.
    r_cw_cv = qvec2rotmat(image.qvec)
    r_wc_cv = r_cw_cv.T
    c_world = -r_wc_cv @ np.asarray(image.tvec, dtype=np.float64)

    # pruning.py documents camera local +X right, +Y up, +Z forward.
    # COLMAP/OpenCV local axes are +X right, +Y down, +Z forward.
    #
    # NOTE ON HANDEDNESS:
    # A pure Y-axis flip (diag(1,-1,1)) changes handedness (det=-1) and therefore
    # cannot be represented as a valid rotation matrix for SciPy's Rotation API.
    # For compatibility with the existing pruning/rendering stack (which expects a
    # proper rotation), we keep a proper axis transform here (identity).
    #
    # If a future pipeline adds explicit handedness-aware transforms, this is the
    # place to apply them.
    r_wc_pruning = r_wc_cv @ axis_transform_cv_to_pruning
    euler_xyz_deg = Rotation.from_matrix(r_wc_pruning).as_euler("xyz", degrees=True)
    euler_xyz_deg = euler_xyz_deg * EULER_SIGN_FLIP

    fx = float(np.asarray(camera.params, dtype=np.float64)[0])
    fov_x_deg = float(2.0 * np.degrees(np.arctan(float(camera.width) / (2.0 * fx))))

    pose_entry = {
        "image_name": image.name,
        "position": c_world.tolist(),
        "rotation_euler_deg": euler_xyz_deg.tolist(),
        "fov_degrees": fov_x_deg,
    }
    return pose_entry, c_world


def convert_scene(scene_dir: Path, scene_name: str, test_every: int = 8) -> None:
    """Convert COLMAP cameras+images to our poses.json format.

    Outputs:
      scene_dir/poses_train.json  (images where idx % test_every != 0)
      scene_dir/poses_test.json   (images where idx % test_every == 0)

    Matches the train/test split convention of Mip-NeRF 360 papers.
    """
    cameras = read_cameras_binary(scene_dir / "cameras.bin")
    images = read_images_binary(scene_dir / "images.bin")

    # Keep proper rotation (det=+1) for current stack.
    axis_transform_cv_to_pruning = np.eye(3, dtype=np.float64)
    sorted_images = sorted(images.values(), key=lambda im: im.name)

    all_pose_entries: list[dict] = []
    all_positions: list[np.ndarray] = []
    aspect_ratios: list[float] = []

    for image in sorted_images:
        camera = cameras[image.camera_id]
        pose_entry, pos = _build_pose_entry(image, camera, axis_transform_cv_to_pruning)
        all_pose_entries.append(pose_entry)
        all_positions.append(pos)
        aspect_ratios.append(float(camera.width) / float(camera.height))

    positions_arr = np.stack(all_positions, axis=0) if all_positions else np.zeros((0, 3), dtype=np.float64)
    centroid = positions_arr.mean(axis=0) if len(positions_arr) > 0 else np.zeros(3, dtype=np.float64)
    max_dist = float(np.linalg.norm(positions_arr - centroid[None, :], axis=1).max()) if len(positions_arr) > 0 else 1.0
    far_plane = 1.5 * max_dist
    if far_plane <= 0:
        far_plane = 1.0
    aspect_ratio = float(np.mean(aspect_ratios)) if aspect_ratios else (16.0 / 9.0)

    def pack_payload(selected: list[dict]) -> dict:
        return {
            "scene_name": scene_name,
            "convention_note": (
                "input COLMAP local axes are OpenCV (+X right, +Y down, +Z forward); "
                "for now we preserve a proper rotation matrix (det=+1) via identity "
                "axis transform to remain compatible with scipy Rotation/Euler conversion. "
                "No handedness-flip reflection is silently applied."
            ),
            "poses": selected,
            "near_plane": 0.1,
            "far_plane": far_plane,
            "aspect_ratio": aspect_ratio,
        }

    train_entries: list[dict] = []
    test_entries: list[dict] = []
    for idx, entry in enumerate(all_pose_entries):
        if idx % test_every == 0:
            test_entries.append(entry)
        else:
            train_entries.append(entry)

    (scene_dir / "poses_train.json").write_text(json.dumps(pack_payload(train_entries), indent=2), encoding="utf-8")
    (scene_dir / "poses_test.json").write_text(json.dumps(pack_payload(test_entries), indent=2), encoding="utf-8")

    if len(positions_arr) > 0:
        pmin = positions_arr.min(axis=0)
        pmax = positions_arr.max(axis=0)
        print(
            f"[done] {scene_name}: n_train={len(train_entries)} n_test={len(test_entries)} "
            f"pose_bbox_min={pmin.tolist()} pose_bbox_max={pmax.tolist()}"
        )
    else:
        print(f"[done] {scene_name}: n_train=0 n_test=0 pose_bbox_min=[] pose_bbox_max=[]")


def _convert_one(scene_dir: Path, test_every: int) -> None:
    scene_dir = scene_dir.resolve()
    if not (scene_dir / "cameras.bin").exists():
        raise FileNotFoundError(f"cameras.bin not found in {scene_dir}")
    if not (scene_dir / "images.bin").exists():
        raise FileNotFoundError(f"images.bin not found in {scene_dir}")
    convert_scene(scene_dir, scene_dir.name, test_every=test_every)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert COLMAP binaries to poses_train/test.json")
    parser.add_argument(
        "--scene_dir",
        "--scene-dir",
        dest="scene_dir",
        type=Path,
        default=None,
        help="Process a single scene directory (must contain cameras.bin and images.bin).",
    )
    parser.add_argument(
        "--test_every",
        type=int,
        default=8,
        help="Split every Nth frame into test set (default: 8).",
    )
    args = parser.parse_args()

    if args.test_every <= 0:
        raise ValueError("--test_every must be > 0")

    if args.scene_dir is not None:
        _convert_one(args.scene_dir, test_every=args.test_every)
    else:
        scene_roots = [
            Path("data/mipnerf360") / "kitchen",
            Path("data/mipnerf360") / "room",
            Path("data/mipnerf360") / "counter",
            Path("data/tandt") / "truck",
            Path("data/tandt") / "train",
        ]
        for scene_dir in scene_roots:
            if not (scene_dir / "cameras.bin").exists() or not (scene_dir / "images.bin").exists():
                print(f"[skip] {scene_dir}: not yet downloaded")
                continue
            convert_scene(scene_dir, scene_dir.name, test_every=args.test_every)

