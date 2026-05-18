from __future__ import annotations

import numpy as np

from src.io import load_ply, save_ply


def test_ply_round_trip(tmp_path) -> None:
    rng = np.random.default_rng(1234)
    n = 1000

    data = {
        "positions": rng.normal(size=(n, 3)).astype(np.float32),
        "scales": rng.normal(size=(n, 3)).astype(np.float32),
        "rotations": rng.normal(size=(n, 4)).astype(np.float32),
        "opacities": rng.normal(size=(n,)).astype(np.float32),
        "colors": rng.normal(size=(n, 3)).astype(np.float32),
    }

    path = tmp_path / "roundtrip.ply"
    save_ply(path, data)
    loaded = load_ply(path)

    for key in data:
        np.testing.assert_array_equal(data[key], loaded[key])

