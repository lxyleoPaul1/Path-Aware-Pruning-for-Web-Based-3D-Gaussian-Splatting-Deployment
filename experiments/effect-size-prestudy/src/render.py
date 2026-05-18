from __future__ import annotations

import math
from typing import Any

import gsplat
import numpy as np
import torch
from gsplat import rasterization

BACKEND = "gsplat-cuda"


def _rotation_matrix_xyz_deg(rotation_euler_deg: np.ndarray) -> np.ndarray:
    rx, ry, rz = np.deg2rad(np.asarray(rotation_euler_deg, dtype=np.float64))
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    rx_m = np.array([[1.0, 0.0, 0.0], [0.0, cx, -sx], [0.0, sx, cx]], dtype=np.float64)
    ry_m = np.array([[cy, 0.0, sy], [0.0, 1.0, 0.0], [-sy, 0.0, cy]], dtype=np.float64)
    rz_m = np.array([[cz, -sz, 0.0], [sz, cz, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)
    return rz_m @ ry_m @ rx_m


def _pose_fov_deg(pose: dict[str, Any]) -> float:
    if "fov_deg" in pose:
        return float(pose["fov_deg"])
    if "fov_degrees" in pose:
        return float(pose["fov_degrees"])
    raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")


def _build_cameras(
    poses: list[dict[str, Any]],
    width: int,
    height: int,
    device: torch.device,
) -> tuple[torch.Tensor, torch.Tensor]:
    viewmats = []
    ks = []
    cx = 0.5 * float(width - 1)
    cy = 0.5 * float(height - 1)
    for pose in poses:
        pos = np.asarray(pose["position"], dtype=np.float64)
        rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
        fov_x_deg = _pose_fov_deg(pose)

        # pose rotation maps camera-local axes to world axes; build world->camera extrinsics.
        r_wc = _rotation_matrix_xyz_deg(rot)
        r_cw = r_wc.T
        t_cw = -r_cw @ pos

        view = np.eye(4, dtype=np.float32)
        view[:3, :3] = r_cw.astype(np.float32)
        view[:3, 3] = t_cw.astype(np.float32)
        viewmats.append(view)

        fx = 0.5 * float(width) / math.tan(math.radians(float(fov_x_deg)) * 0.5)
        fy = fx
        k = np.array([[fx, 0.0, cx], [0.0, fy, cy], [0.0, 0.0, 1.0]], dtype=np.float32)
        ks.append(k)
    viewmats_t = torch.from_numpy(np.stack(viewmats, axis=0)).to(device=device, dtype=torch.float32)
    ks_t = torch.from_numpy(np.stack(ks, axis=0)).to(device=device, dtype=torch.float32)
    return viewmats_t, ks_t


def render_views(
    positions,
    scales,
    rotations_quat,
    opacities,
    colors_sh,
    poses,
    image_size=(800, 450),
) -> np.ndarray:
    """Render splat scene using CUDA gsplat rasterization."""
    width, height = int(image_size[0]), int(image_size[1])
    if width <= 0 or height <= 0:
        raise ValueError("image_size must be positive")

    means = np.asarray(positions, dtype=np.float32)
    scales_np = np.asarray(scales, dtype=np.float32)
    quats = np.asarray(rotations_quat, dtype=np.float32)
    op = np.asarray(opacities, dtype=np.float32).reshape(-1)
    colors = np.asarray(colors_sh, dtype=np.float32)
    if means.ndim != 2 or means.shape[1] != 3:
        raise ValueError("positions must have shape (M, 3)")
    m = means.shape[0]
    if scales_np.shape != (m, 3):
        raise ValueError("scales must have shape (M, 3)")
    if quats.shape != (m, 4):
        raise ValueError("rotations_quat must have shape (M, 4)")
    if op.shape != (m,):
        raise ValueError("opacities must have shape (M,)")
    if colors.shape != (m, 3):
        raise ValueError("colors_sh must have shape (M, 3)")
    if not torch.cuda.is_available():
        raise RuntimeError("BACKEND=gsplat-cuda requires CUDA, but torch.cuda.is_available() is False")

    device = torch.device("cuda")
    means_t = torch.from_numpy(means).to(device=device, dtype=torch.float32)
    quats_t = torch.from_numpy(quats).to(device=device, dtype=torch.float32)
    scales_t = torch.from_numpy(scales_np).to(device=device, dtype=torch.float32)
    op_t = torch.from_numpy(op).to(device=device, dtype=torch.float32)
    colors_t = torch.from_numpy(colors).to(device=device, dtype=torch.float32)
    viewmats_t, ks_t = _build_cameras(list(poses), width, height, device)

    renders, _alphas, _meta = rasterization(
        means=means_t,
        quats=quats_t,
        scales=scales_t,
        opacities=op_t,
        colors=colors_t,
        viewmats=viewmats_t,
        Ks=ks_t,
        width=width,
        height=height,
        sh_degree=None,
        render_mode="RGB",
    )
    if renders.ndim != 4 or renders.shape[0] != len(poses):
        raise RuntimeError(f"unexpected render output shape: {tuple(renders.shape)}")
    out = renders.detach().clamp(0.0, 1.0).cpu().numpy().astype(np.float32)
    return out

