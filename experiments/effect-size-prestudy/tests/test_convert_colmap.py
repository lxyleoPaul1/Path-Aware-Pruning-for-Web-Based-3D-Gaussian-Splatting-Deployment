from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from scripts.convert_colmap_to_poses import convert_scene
from scripts.read_write_model import Camera, Image, write_cameras_binary, write_images_binary


def test_convert_scene_positions_match_synthetic_colmap(tmp_path: Path) -> None:
    scene_dir = tmp_path / "kitchen"
    scene_dir.mkdir(parents=True, exist_ok=True)

    cameras = {
        1: Camera(
            id=1,
            model="PINHOLE",
            width=800,
            height=600,
            params=np.array([500.0, 500.0, 400.0, 300.0], dtype=np.float64),
        )
    }

    expected_centers = [
        np.array([0.0, 0.0, 0.0], dtype=np.float64),
        np.array([1.0, 2.0, 3.0], dtype=np.float64),
        np.array([-2.0, 0.5, 4.0], dtype=np.float64),
    ]
    images = {}
    for i, c in enumerate(expected_centers, start=1):
        # Identity rotation in world->camera.
        qvec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float64)
        # t = -R * C, with R=I.
        tvec = -c
        images[i] = Image(
            id=i,
            qvec=qvec,
            tvec=tvec,
            camera_id=1,
            name=f"img_{i:03d}.png",
        )

    write_cameras_binary(cameras, scene_dir / "cameras.bin")
    write_images_binary(images, scene_dir / "images.bin")

    convert_scene(scene_dir, "kitchen", test_every=8)

    train_payload = json.loads((scene_dir / "poses_train.json").read_text(encoding="utf-8"))
    test_payload = json.loads((scene_dir / "poses_test.json").read_text(encoding="utf-8"))
    all_poses = test_payload["poses"] + train_payload["poses"]

    assert len(all_poses) == 3
    got_by_name = {p["image_name"]: np.asarray(p["position"], dtype=np.float64) for p in all_poses}
    for i, expected in enumerate(expected_centers, start=1):
        key = f"img_{i:03d}.png"
        np.testing.assert_allclose(got_by_name[key], expected, atol=1e-6)

