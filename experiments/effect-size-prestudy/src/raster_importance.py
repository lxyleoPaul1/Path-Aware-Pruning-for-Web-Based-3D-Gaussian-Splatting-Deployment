from __future__ import annotations

import math
from typing import Any

import numpy as np
import torch
from gsplat import rasterization


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

        rx, ry, rz = np.deg2rad(rot)
        cxr, sxr = math.cos(rx), math.sin(rx)
        cyr, syr = math.cos(ry), math.sin(ry)
        czr, szr = math.cos(rz), math.sin(rz)
        rx_m = np.array([[1.0, 0.0, 0.0], [0.0, cxr, -sxr], [0.0, sxr, cxr]], dtype=np.float64)
        ry_m = np.array([[cyr, 0.0, syr], [0.0, 1.0, 0.0], [-syr, 0.0, cyr]], dtype=np.float64)
        rz_m = np.array([[czr, -szr, 0.0], [szr, czr, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)
        r_wc = rz_m @ ry_m @ rx_m
        r_cw = r_wc.T
        t_cw = -r_cw @ pos

        view = np.eye(4, dtype=np.float32)
        view[:3, :3] = r_cw.astype(np.float32)
        view[:3, 3] = t_cw.astype(np.float32)
        viewmats.append(view)

        fov_x_deg = _pose_fov_deg(pose)
        fx = 0.5 * float(width) / math.tan(math.radians(fov_x_deg) * 0.5)
        fy = fx
        k = np.array([[fx, 0.0, cx], [0.0, fy, cy], [0.0, 0.0, 1.0]], dtype=np.float32)
        ks.append(k)

    viewmats_t = torch.from_numpy(np.stack(viewmats, axis=0)).to(device=device, dtype=torch.float32)
    ks_t = torch.from_numpy(np.stack(ks, axis=0)).to(device=device, dtype=torch.float32)
    return viewmats_t, ks_t


def _decode_scales(scales_raw: np.ndarray) -> np.ndarray:
    return np.exp(scales_raw)


def _decode_opacities(opacities_raw: np.ndarray) -> np.ndarray:
    x = np.asarray(opacities_raw, dtype=np.float64)
    return np.where(x >= 0.0, 1.0 / (1.0 + np.exp(-x)), np.exp(x) / (1.0 + np.exp(x)))


def raster_based_importance(
    positions: np.ndarray,
    scales_raw: np.ndarray,
    rotations: np.ndarray,
    opacities_raw: np.ndarray,
    colors_sh: np.ndarray,
    poses: list[dict],
    image_size: tuple[int, int] = (400, 225),
) -> np.ndarray:
    """Estimate per-Gaussian contribution by autograd proxy on opacity."""
    if not torch.cuda.is_available():
        raise RuntimeError("raster_based_importance requires CUDA")

    width, height = int(image_size[0]), int(image_size[1])
    if width <= 0 or height <= 0:
        raise ValueError("image_size must be positive")

    device = torch.device("cuda")
    means_t = torch.from_numpy(np.asarray(positions, dtype=np.float32)).to(device=device)
    scales_t = torch.from_numpy(_decode_scales(np.asarray(scales_raw, dtype=np.float64)).astype(np.float32)).to(device=device)
    quats_t = torch.from_numpy(np.asarray(rotations, dtype=np.float32)).to(device=device)
    opa0 = _decode_opacities(np.asarray(opacities_raw, dtype=np.float64)).astype(np.float32)
    opacities_t = torch.from_numpy(opa0).to(device=device)
    opacities_t.requires_grad_(True)

    colors_np = np.asarray(colors_sh, dtype=np.float32)
    if colors_np.ndim == 2:
        colors_t = torch.from_numpy(colors_np).to(device=device)
        sh_degree = None
    elif colors_np.ndim == 3:
        colors_t = torch.from_numpy(colors_np).to(device=device)
        k = int(colors_np.shape[1])
        sh_degree = max(0, int(round(math.sqrt(k))) - 1)
    else:
        raise ValueError("colors_sh must have shape (M,3) or (M,K,3)")

    viewmats_t, ks_t = _build_cameras(list(poses), width, height, device)
    importance = torch.zeros_like(opacities_t, dtype=torch.float32)

    # Pose-by-pose rendering to keep memory bounded.
    for i in range(viewmats_t.shape[0]):
        if opacities_t.grad is not None:
            opacities_t.grad.zero_()
        render_colors, render_alphas, _meta = rasterization(
            means=means_t,
            quats=quats_t,
            scales=scales_t,
            opacities=opacities_t,
            colors=colors_t,
            viewmats=viewmats_t[i : i + 1],
            Ks=ks_t[i : i + 1],
            width=width,
            height=height,
            sh_degree=sh_degree,
            render_mode="RGB",
        )
        # Contribution proxy: sensitivity of total alpha/image mass to each Gaussian opacity.
        loss = render_alphas.sum() + 0.1 * render_colors.sum()
        loss.backward()
        if opacities_t.grad is None:
            raise RuntimeError("opacity gradient is None; raster-based proxy failed")
        importance += opacities_t.grad.detach().abs()

    return importance.detach().cpu().numpy().astype(np.float64)
