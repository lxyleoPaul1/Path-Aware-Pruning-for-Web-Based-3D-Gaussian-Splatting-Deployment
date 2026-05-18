from __future__ import annotations

import math

import numpy as np

from src.pruning import path_aware_importance


def _topk_mask(scores: np.ndarray, keep_count: int, safeguard_ratio: float = 0.0, seed: int = 0) -> np.ndarray:
    n = scores.shape[0]
    keep_count = int(max(0, min(n, keep_count)))
    mask = np.zeros(n, dtype=bool)
    order = np.argsort(scores)[::-1]
    if keep_count > 0:
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
    """Uniformly random retention mask."""
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
    """Keep top Gaussians by alpha * ellipsoid volume proxy."""
    if not 0.0 <= keep_ratio <= 1.0:
        raise ValueError("keep_ratio must be in [0, 1]")
    scl = np.asarray(scales, dtype=np.float64)
    opa = np.asarray(opacities, dtype=np.float64)
    if scl.ndim != 2 or scl.shape[1] != 3:
        raise ValueError("scales must have shape (M, 3)")
    if opa.shape != (scl.shape[0],):
        raise ValueError("opacities must have shape (M,)")

    vol = (4.0 / 3.0) * math.pi * np.abs(scl[:, 0] * scl[:, 1] * scl[:, 2])
    scores = opa * vol
    keep_count = int(math.ceil(keep_ratio * scl.shape[0]))
    return _topk_mask(scores, keep_count)


def path_aware_pruning(
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    poses: list[dict],
    keep_ratio: float,
    safeguard_ratio: float = 0.0,
    seed: int = 0,
    **frustum_kwargs,
) -> np.ndarray:
    if not 0.0 <= keep_ratio <= 1.0:
        raise ValueError("keep_ratio must be in [0, 1]")
    scores = path_aware_importance(
        positions=positions,
        scales=scales,
        opacities=opacities,
        poses=poses,
        **frustum_kwargs,
    )
    keep_count = int(math.ceil(keep_ratio * scores.shape[0]))
    return _topk_mask(scores, keep_count, safeguard_ratio=safeguard_ratio, seed=seed)


from .lightgaussian import lightgaussian_importance

__all__ = [
    "lightgaussian_importance",
    "path_aware_pruning",
    "random_pruning",
    "visibility_pruning",
]
