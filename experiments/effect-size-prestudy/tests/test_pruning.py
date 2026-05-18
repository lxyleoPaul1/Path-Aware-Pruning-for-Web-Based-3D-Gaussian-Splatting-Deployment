from __future__ import annotations

import math

import numpy as np

from src.baselines import path_aware_pruning, random_pruning, visibility_pruning
from src.pruning import compute_frustum_planes, path_aware_importance, point_in_frustum_batch


def test_point_in_frustum_batch_basic_case() -> None:
    planes = compute_frustum_planes(
        position=np.array([0.0, 0.0, 0.0], dtype=np.float64),
        rotation_euler_deg=np.array([0.0, 0.0, 0.0], dtype=np.float64),
        fov_deg=90.0,
        aspect=1.0,
        near=0.1,
        far=10.0,
    )
    points = np.array(
        [
            [0.0, 0.0, 2.0],   # in front, inside
            [0.0, 0.0, -2.0],  # behind camera
            [3.0, 0.0, 2.0],   # too far to the side
            [0.5, 0.5, 2.0],   # inside
        ],
        dtype=np.float64,
    )
    inside = point_in_frustum_batch(points, planes)
    np.testing.assert_array_equal(inside, np.array([True, False, False, True]))


def test_importance_doubles_with_opacity_for_visible_gaussian() -> None:
    positions = np.array([[0.0, 0.0, 3.0]], dtype=np.float64)
    scales = np.array([[1.0, 1.0, 1.0]], dtype=np.float64)
    poses = [{"position": [0.0, 0.0, 0.0], "rotation_euler_deg": [0.0, 0.0, 0.0], "fov_deg": 60.0}]

    imp_a = path_aware_importance(positions, scales, np.array([0.25]), poses)
    imp_b = path_aware_importance(positions, scales, np.array([0.50]), poses)
    np.testing.assert_allclose(imp_b, 2.0 * imp_a, rtol=1e-7, atol=1e-9)


def test_keep_ratio_target_count_for_pruning_masks() -> None:
    m = 17
    keep_ratio = 0.3
    target = int(math.ceil(keep_ratio * m))

    rng = np.random.default_rng(42)
    positions = rng.normal(size=(m, 3))
    # Positive scales for volume/radius use.
    scales = np.abs(rng.normal(size=(m, 3))) + 0.1
    opacities = rng.uniform(0.1, 1.0, size=(m,))
    poses = [{"position": [0.0, 0.0, 0.0], "rotation_euler_deg": [0.0, 0.0, 0.0], "fov_deg": 70.0}]

    m_random = random_pruning(m, keep_ratio, seed=0)
    m_vis = visibility_pruning(scales, opacities, keep_ratio)
    m_path = path_aware_pruning(positions, scales, opacities, poses, keep_ratio)

    assert int(m_random.sum()) == target
    assert abs(int(m_vis.sum()) - target) <= 1
    assert abs(int(m_path.sum()) - target) <= 1

