from __future__ import annotations

import math
import os

import numpy as np


def _exp_scales(scales_raw: np.ndarray) -> np.ndarray:
    """3DGS PLY stores scale as log(σ). Convert to linear."""
    return np.exp(scales_raw)


def _sigmoid_opacities(opacities_raw: np.ndarray) -> np.ndarray:
    """3DGS PLY stores opacity as logit(α). Convert to α ∈ (0,1)."""
    # numerically stable sigmoid
    return np.where(
        opacities_raw >= 0,
        1.0 / (1.0 + np.exp(-opacities_raw)),
        np.exp(opacities_raw) / (1.0 + np.exp(opacities_raw)),
    )


def _topk_mask(scores: np.ndarray, keep_ratio: float, safeguard_ratio: float = 0.0, seed: int = 0) -> np.ndarray:
    n = int(scores.shape[0])
    keep_count = int(math.ceil(float(keep_ratio) * n))
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
            mask[rng.choice(dropped, size=extra_count, replace=False)] = True
    return mask


def random_pruning(num_gaussians: int, keep_ratio: float, seed: int = 0) -> np.ndarray:
    if not 0.0 <= keep_ratio <= 1.0:
        raise ValueError("keep_ratio must be in [0, 1]")
    n = int(num_gaussians)
    keep_count = int(math.ceil(keep_ratio * n))
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    mask = np.zeros(n, dtype=bool)
    mask[perm[:keep_count]] = True
    return mask


def visibility_pruning(scales: np.ndarray, opacities: np.ndarray, keep_ratio: float) -> np.ndarray:
    if not 0.0 <= keep_ratio <= 1.0:
        raise ValueError("keep_ratio must be in [0, 1]")
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))
    if scl.ndim != 2 or scl.shape[1] != 3:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (scl.shape[0],):
        raise ValueError("opacities must have shape (M,)")
    # ellipsoid volume proxy
    vol = (4.0 / 3.0) * math.pi * scl[:, 0] * scl[:, 1] * scl[:, 2]
    score = opa * vol
    return _topk_mask(score, keep_ratio)


def _rotation_matrix_xyz_deg(rotation_euler_deg: np.ndarray) -> np.ndarray:
    """Return R = Rz @ Ry @ Rx for XYZ Euler angles (degrees)."""
    rx, ry, rz = np.deg2rad(np.asarray(rotation_euler_deg, dtype=np.float64))

    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)

    rx_m = np.array([[1.0, 0.0, 0.0], [0.0, cx, -sx], [0.0, sx, cx]], dtype=np.float64)
    ry_m = np.array([[cy, 0.0, sy], [0.0, 1.0, 0.0], [-sy, 0.0, cy]], dtype=np.float64)
    rz_m = np.array([[cz, -sz, 0.0], [sz, cz, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)
    return rz_m @ ry_m @ rx_m


def _make_plane(normal: np.ndarray, point: np.ndarray) -> np.ndarray:
    n = np.asarray(normal, dtype=np.float64)
    n /= np.linalg.norm(n) + 1e-12
    d = -float(np.dot(n, point))
    return np.array([n[0], n[1], n[2], d], dtype=np.float64)


def compute_frustum_planes(
    position: np.ndarray,
    rotation_euler_deg: np.ndarray,
    fov_deg: float,
    aspect: float,
    near: float,
    far: float,
) -> np.ndarray:
    """Return 6 frustum planes in Hessian form [nx, ny, nz, d].

    Convention used here:
    - camera forward is local +Z
    - inside test is n·x + d >= 0 for every plane
    """
    if near <= 0 or far <= near:
        raise ValueError("frustum requires 0 < near < far")
    if aspect <= 0:
        raise ValueError("aspect must be positive")

    pos = np.asarray(position, dtype=np.float64)
    r = _rotation_matrix_xyz_deg(rotation_euler_deg)
    right = r[:, 0]
    up = r[:, 1]
    forward = r[:, 2]

    tan_y = math.tan(math.radians(float(fov_deg)) * 0.5)
    tan_x = tan_y * float(aspect)

    near_plane = _make_plane(forward, pos + forward * near)
    far_plane = _make_plane(-forward, pos + forward * far)

    left_normal_local = np.array([1.0, 0.0, tan_x], dtype=np.float64)
    right_normal_local = np.array([-1.0, 0.0, tan_x], dtype=np.float64)
    bottom_normal_local = np.array([0.0, 1.0, tan_y], dtype=np.float64)
    top_normal_local = np.array([0.0, -1.0, tan_y], dtype=np.float64)

    basis = np.stack([right, up, forward], axis=1)
    left_plane = _make_plane(basis @ left_normal_local, pos)
    right_plane = _make_plane(basis @ right_normal_local, pos)
    bottom_plane = _make_plane(basis @ bottom_normal_local, pos)
    top_plane = _make_plane(basis @ top_normal_local, pos)

    return np.stack([near_plane, far_plane, left_plane, right_plane, bottom_plane, top_plane], axis=0)


def point_in_frustum_batch(points: np.ndarray, planes: np.ndarray) -> np.ndarray:
    pts = np.asarray(points, dtype=np.float64)
    pls = np.asarray(planes, dtype=np.float64)
    signed = pts @ pls[:, :3].T + pls[:, 3][None, :]
    return np.all(signed >= 0.0, axis=1)


def path_aware_importance(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
) -> np.ndarray:
    """Compute path-aware importance over a sequence of camera poses."""
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    sigma = np.cbrt(np.prod(scl, axis=1))
    importance = np.zeros(pos.shape[0], dtype=np.float64)

    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")

        planes = compute_frustum_planes(
            position=cam_pos,
            rotation_euler_deg=cam_rot,
            fov_deg=fov,
            aspect=aspect,
            near=near,
            far=far,
        )

        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        falloff = np.minimum(1.0, np.where(d > 0.0, (sigma / d) ** 2, np.inf))
        importance += visible * falloff * opa

    return importance


def path_aware_v2_no_sigma(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    **kwargs,
) -> np.ndarray:
    """v2: I_j = sum_i v_ij * alpha_j."""
    del rotations, kwargs
    pos = np.asarray(positions, dtype=np.float64)
    _ = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    counts = np.zeros(pos.shape[0], dtype=np.float64)
    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        counts += point_in_frustum_batch(pos, planes).astype(np.float64)
    return counts * opa


def path_aware_v3_sqrt_count(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    **kwargs,
) -> np.ndarray:
    """v3: I_j = alpha_j * sqrt(sum_i v_ij)."""
    del rotations, kwargs
    pos = np.asarray(positions, dtype=np.float64)
    _ = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    counts = np.zeros(pos.shape[0], dtype=np.float64)
    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        counts += point_in_frustum_batch(pos, planes).astype(np.float64)
    return opa * np.sqrt(counts)


def path_aware_v4_log_count(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    **kwargs,
) -> np.ndarray:
    """v4: I_j = alpha_j * log(1 + sum_i v_ij)."""
    del rotations, kwargs
    pos = np.asarray(positions, dtype=np.float64)
    _ = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    counts = np.zeros(pos.shape[0], dtype=np.float64)
    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        counts += point_in_frustum_batch(pos, planes).astype(np.float64)
    return opa * np.log1p(counts)


def _infer_scene_scale(poses: list[dict], kwargs: dict) -> float:
    scene_scale = kwargs.get("scene_scale", None)
    if scene_scale is None:
        cam_positions = np.asarray([pose["position"] for pose in poses], dtype=np.float64)
        if cam_positions.ndim != 2 or cam_positions.shape[1] != 3:
            raise ValueError("pose positions must have shape (N, 3)")
        centroid = cam_positions.mean(axis=0)
        radii = np.linalg.norm(cam_positions - centroid[None, :], axis=1)
        scene_camera_radius = float(np.mean(radii))
        scene_scale = scene_camera_radius
        # Guard against tiny/degenerate camera trajectories.
        if (not np.isfinite(scene_scale)) or scene_scale < 0.1:
            scene_scale = max(1.0, scene_camera_radius)
    else:
        scene_scale = float(scene_scale)
    if not np.isfinite(scene_scale) or scene_scale <= 0.0:
        raise ValueError(f"scene_scale must be positive finite, got {scene_scale}")
    return scene_scale


def path_aware_v5_linear_falloff(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    _debug_dump_path: str | None = None,
    **kwargs,
) -> np.ndarray:
    """v5 (scale-invariant): I_j = max_i(v_ij * w_ij * alpha_j) * log(1 + hit_count_j)."""
    del rotations
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    scene_scale = _infer_scene_scale(poses, kwargs)

    sigma = np.cbrt(np.prod(scl, axis=1))
    max_w_alpha = np.zeros(pos.shape[0], dtype=np.float64)
    hit_counts = np.zeros(pos.shape[0], dtype=np.float64)
    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        hit_counts += visible
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        relative_d = np.where(d > 0.0, d / scene_scale, np.inf)
        falloff = np.minimum(1.0, np.where(relative_d > 0.0, sigma / relative_d, np.inf))
        max_w_alpha = np.maximum(max_w_alpha, visible * falloff * opa)
    importance = max_w_alpha * np.log1p(hit_counts)
    if _debug_dump_path is not None:
        np.savez(
            _debug_dump_path,
            importance=importance,
            hit_count=hit_counts,
            max_w_alpha=max_w_alpha,
            sigma=sigma,
        )
    if os.environ.get("V5_DIAG_HIT_COUNTS", "0") == "1":
        hit_zero_ratio = float(np.mean(hit_counts <= 0.0))
        print(
            "[v5-hit-diagnosis] "
            f"hit_counts(mean={float(np.mean(hit_counts)):.6f}, "
            f"median={float(np.median(hit_counts)):.6f}, "
            f"max={float(np.max(hit_counts)):.6f}, "
            f"zero_ratio={hit_zero_ratio:.6f})"
        )
        print(
            "[v5-hit-diagnosis] "
            f"importance(mean={float(np.mean(importance)):.6f}, "
            f"median={float(np.median(importance)):.6f}, "
            f"max={float(np.max(importance)):.6f})"
        )
    return importance


def path_aware_v5_pure_sum(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    **kwargs,
) -> np.ndarray:
    """V5-Pure-Sum: I_j = sum_i v_ij * min(1, sigma_j/(d_ij/scene_scale)) * alpha_j."""
    del rotations
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    scene_scale = _infer_scene_scale(poses, kwargs)
    sigma = np.cbrt(np.prod(scl, axis=1))
    importance = np.zeros(pos.shape[0], dtype=np.float64)

    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        relative_d = np.where(d > 0.0, d / scene_scale, np.inf)
        falloff = np.minimum(1.0, np.where(relative_d > 0.0, sigma / relative_d, np.inf))
        importance += visible * falloff * opa
    return importance


def path_aware_v5_sqrt_clamp(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    hit_clamp: float = 30.0,
    **kwargs,
) -> np.ndarray:
    """V5-Sqrt-Clamp: I_j = max_i(w_ij * alpha_j) * sqrt(min(hit_count_j, K))."""
    del rotations
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    scene_scale = _infer_scene_scale(poses, kwargs)
    sigma = np.cbrt(np.prod(scl, axis=1))
    hit_counts = np.zeros(pos.shape[0], dtype=np.float64)
    max_w_alpha = np.zeros(pos.shape[0], dtype=np.float64)

    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        hit_counts += visible
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        relative_d = np.where(d > 0.0, d / scene_scale, np.inf)
        falloff = np.minimum(1.0, np.where(relative_d > 0.0, sigma / relative_d, np.inf))
        max_w_alpha = np.maximum(max_w_alpha, visible * falloff * opa)

    return max_w_alpha * np.sqrt(np.minimum(hit_counts, float(hit_clamp)))


def path_aware_v5_weighted_sum(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    beta: float = 0.1,
    **kwargs,
) -> np.ndarray:
    """V5-Weighted-Sum: I_j = max_i(w_ij * alpha_j) + beta * log1p(hit_count_j)/log1p(N)."""
    del rotations
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    scene_scale = _infer_scene_scale(poses, kwargs)
    sigma = np.cbrt(np.prod(scl, axis=1))
    hit_counts = np.zeros(pos.shape[0], dtype=np.float64)
    max_w_alpha = np.zeros(pos.shape[0], dtype=np.float64)

    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")
        planes = compute_frustum_planes(cam_pos, cam_rot, fov, aspect, near, far)
        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        hit_counts += visible
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        relative_d = np.where(d > 0.0, d / scene_scale, np.inf)
        falloff = np.minimum(1.0, np.where(relative_d > 0.0, sigma / relative_d, np.inf))
        max_w_alpha = np.maximum(max_w_alpha, visible * falloff * opa)

    num_poses = max(1, len(poses))
    return max_w_alpha + float(beta) * np.log1p(hit_counts) / np.log1p(float(num_poses))


def combined_pruning(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    poses: list[dict],
    keep_ratio: float,
    lam: float = 0.7,
    normalize: str = "rank",
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 16 / 9,
    safeguard_ratio: float = 0.0,
    seed: int = 0,
) -> np.ndarray:
    if not 0.0 <= keep_ratio <= 1.0:
        raise ValueError("keep_ratio must be in [0, 1]")
    if not 0.0 <= lam <= 1.0:
        raise ValueError("lam must be in [0, 1]")

    path_scores = path_aware_importance(
        positions=positions,
        scales=scales,
        opacities=opacities,
        poses=poses,
        near=near,
        far=far,
        aspect=aspect,
    )
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))
    vis_scores = opa * ((4.0 / 3.0) * math.pi * np.prod(scl, axis=1))

    if normalize == "rank":
        p = np.argsort(np.argsort(path_scores)).astype(np.float64) / max(1, len(path_scores) - 1)
        v = np.argsort(np.argsort(vis_scores)).astype(np.float64) / max(1, len(vis_scores) - 1)
    else:
        p = (path_scores - path_scores.min()) / (np.ptp(path_scores) + 1e-12)
        v = (vis_scores - vis_scores.min()) / (np.ptp(vis_scores) + 1e-12)

    combo = lam * p + (1.0 - lam) * v
    return _topk_mask(combo, keep_ratio, safeguard_ratio=safeguard_ratio, seed=seed)


def debug_path_aware_components(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    rotations: np.ndarray,
    poses: list[dict],
    near: float = 0.1,
    far: float = 150.0,
    aspect: float = 1.78,
) -> dict[str, np.ndarray]:
    """Decompose path-aware importance into interpretable score components."""
    pos = np.asarray(positions, dtype=np.float64)
    scl = _exp_scales(np.asarray(scales, dtype=np.float64))
    opa = _sigmoid_opacities(np.asarray(opacities, dtype=np.float64))
    _ = np.asarray(rotations)  # kept for API completeness; not used in current frustum-only model

    if pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    if scl.shape != pos.shape:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (pos.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    sigma = np.cbrt(np.prod(scl, axis=1))
    score_visibility_only = np.zeros(pos.shape[0], dtype=np.float64)
    score_sigma_falloff = np.zeros(pos.shape[0], dtype=np.float64)
    score_alpha_only = np.zeros(pos.shape[0], dtype=np.float64)
    score_full = np.zeros(pos.shape[0], dtype=np.float64)

    for pose in poses:
        cam_pos = np.asarray(pose["position"], dtype=np.float64)
        cam_rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        if "fov_deg" in pose:
            fov = float(pose["fov_deg"])
        elif "fov_degrees" in pose:
            fov = float(pose["fov_degrees"])
        else:
            raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")

        planes = compute_frustum_planes(
            position=cam_pos,
            rotation_euler_deg=cam_rot,
            fov_deg=fov,
            aspect=aspect,
            near=near,
            far=far,
        )
        visible = point_in_frustum_batch(pos, planes).astype(np.float64)
        d = np.linalg.norm(pos - cam_pos[None, :], axis=1)
        falloff = np.minimum(1.0, np.where(d > 0.0, (sigma / d) ** 2, np.inf))

        score_visibility_only += visible
        score_sigma_falloff += visible * falloff
        score_alpha_only += visible * opa
        score_full += visible * falloff * opa

    return {
        "score_visibility_only": score_visibility_only,
        "score_sigma_falloff": score_sigma_falloff,
        "score_alpha_only": score_alpha_only,
        "score_full": score_full,
    }

