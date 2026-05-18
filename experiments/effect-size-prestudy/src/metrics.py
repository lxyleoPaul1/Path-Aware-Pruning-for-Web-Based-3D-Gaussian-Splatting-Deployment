from __future__ import annotations

import numpy as np
import torch
from lpips import LPIPS
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

_LPIPS_MODEL: LPIPS | None = None


def _validate_image(img: np.ndarray) -> np.ndarray:
    arr = np.asarray(img, dtype=np.float32)
    if arr.ndim != 3 or arr.shape[2] != 3:
        raise ValueError("image must have shape (H, W, 3)")
    if np.any(arr < 0.0) or np.any(arr > 1.0):
        raise ValueError("image values must be in [0, 1]")
    return arr


def psnr(img_a: np.ndarray, img_b: np.ndarray) -> float:
    a = _validate_image(img_a)
    b = _validate_image(img_b)
    return float(peak_signal_noise_ratio(a, b, data_range=1.0))


def ssim(img_a: np.ndarray, img_b: np.ndarray) -> float:
    a = _validate_image(img_a)
    b = _validate_image(img_b)
    return float(structural_similarity(a, b, data_range=1.0, channel_axis=2))


def _get_lpips_model() -> LPIPS:
    global _LPIPS_MODEL
    if _LPIPS_MODEL is None:
        # Use VGG backbone for LPIPS; random init keeps tests offline-friendly.
        _LPIPS_MODEL = LPIPS(net="vgg", pnet_rand=True).eval()
    return _LPIPS_MODEL


def lpips_distance(img_a: np.ndarray, img_b: np.ndarray) -> float:
    a = _validate_image(img_a)
    b = _validate_image(img_b)
    model = _get_lpips_model()

    # LPIPS expects NCHW tensors in [-1, 1].
    ta = torch.from_numpy((a * 2.0 - 1.0).transpose(2, 0, 1)).unsqueeze(0)
    tb = torch.from_numpy((b * 2.0 - 1.0).transpose(2, 0, 1)).unsqueeze(0)
    with torch.no_grad():
        value = model(ta, tb)
    return float(value.item())

