from __future__ import annotations

from typing import Any

import numpy as np
import torch
from gsplat import rasterization

from src.raster_importance import _build_cameras, _decode_opacities, _decode_scales


def _depth_transmittance_per_pose(
    means: torch.Tensor,
    viewmat: torch.Tensor,
    alpha_linear: torch.Tensor,
) -> torch.Tensor:
    """
    Approximate T_j(i) with camera-depth global ordering for a pose.

    LightGaussian defines T_j(i) as cumulative transmittance before Gaussian j along rays.
    gsplat's high-level API does not expose per-ray cumulative transmittance per Gaussian, so
    we approximate it with a single front-to-back ordering in camera space for this pose.
    """
    cam = (means @ viewmat[:3, :3].T) + viewmat[:3, 3]
    depth = cam[:, 2]
    valid = depth > 0
    order = torch.argsort(depth)
    order = order[valid[order]]

    t = torch.zeros_like(alpha_linear)
    if order.numel() == 0:
        return t

    a = torch.clamp(alpha_linear[order], 0.0, 0.999999)
    one = torch.ones((1,), device=alpha_linear.device, dtype=alpha_linear.dtype)
    prefix = torch.cumprod(torch.cat([one, 1.0 - a[:-1]], dim=0), dim=0)
    t[order] = prefix
    return t


def lightgaussian_importance(
    positions: np.ndarray,
    scales_raw: np.ndarray,
    rotations: np.ndarray,
    opacities_raw: np.ndarray,
    colors_sh: np.ndarray,
    poses: list[dict[str, Any]],
    image_size: tuple[int, int] = (400, 225),
) -> np.ndarray:
    """
    LightGaussian baseline importance (Eq. 5):
      I(g_j) = sum_i hit_count(g_j, pose_i) * T_j(i)

    hit_count is approximated from gsplat packed metadata (`tiles_per_gauss`), and T is
    computed as front-to-back cumulative transmittance in camera-depth order per pose.
    """
    if not torch.cuda.is_available():
        raise RuntimeError("lightgaussian_importance requires CUDA")

    width, height = int(image_size[0]), int(image_size[1])
    if width <= 0 or height <= 0:
        raise ValueError("image_size must be positive")

    device = torch.device("cuda")
    means_t = torch.from_numpy(np.asarray(positions, dtype=np.float32)).to(device=device)
    scales_t = torch.from_numpy(_decode_scales(np.asarray(scales_raw, dtype=np.float64)).astype(np.float32)).to(device=device)
    quats_t = torch.from_numpy(np.asarray(rotations, dtype=np.float32)).to(device=device)
    alpha_linear = torch.from_numpy(_decode_opacities(np.asarray(opacities_raw, dtype=np.float64)).astype(np.float32)).to(device=device)

    colors_np = np.asarray(colors_sh, dtype=np.float32)
    if colors_np.ndim == 2:
        colors_t = torch.from_numpy(colors_np).to(device=device)
        sh_degree = None
    elif colors_np.ndim == 3:
        colors_t = torch.from_numpy(colors_np).to(device=device)
        k = int(colors_np.shape[1])
        sh_degree = max(0, int(round(np.sqrt(k))) - 1)
    else:
        raise ValueError("colors_sh must have shape (M,3) or (M,K,3)")

    viewmats_t, ks_t = _build_cameras(list(poses), width, height, device)
    m = int(means_t.shape[0])
    importance = torch.zeros((m,), device=device, dtype=torch.float32)

    for i in range(viewmats_t.shape[0]):
        _render_colors, _render_alphas, meta = rasterization(
            means=means_t,
            quats=quats_t,
            scales=scales_t,
            opacities=alpha_linear,
            colors=colors_t,
            viewmats=viewmats_t[i : i + 1],
            Ks=ks_t[i : i + 1],
            width=width,
            height=height,
            sh_degree=sh_degree,
            render_mode="RGB",
            packed=True,
        )

        hit_count = torch.zeros((m,), device=device, dtype=torch.float32)
        if "gaussian_ids" in meta:
            gaussian_ids = meta["gaussian_ids"].to(device=device, dtype=torch.long)
            if gaussian_ids.numel() > 0:
                if "tiles_per_gauss" in meta:
                    tile_size = int(meta.get("tile_size", 16))
                    hits = meta["tiles_per_gauss"].to(device=device, dtype=torch.float32)
                    hits = hits * float(tile_size * tile_size)
                else:
                    hits = torch.ones_like(gaussian_ids, dtype=torch.float32, device=device)
                hit_count.index_add_(0, gaussian_ids, hits)

        t_pose = _depth_transmittance_per_pose(means_t, viewmats_t[i], alpha_linear)
        importance += hit_count * t_pose

    return importance.detach().cpu().numpy().astype(np.float64)
