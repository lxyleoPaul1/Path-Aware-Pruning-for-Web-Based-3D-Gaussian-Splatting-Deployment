from __future__ import annotations

"""Minimal COLMAP model read/write helpers used by local tooling/tests.

This module provides a compact subset of the official COLMAP Python API shape
(`Camera`, `Image`, `read_*_binary`, `write_*_binary`, `qvec2rotmat`), so
conversion scripts can depend on a stable interface.
"""

from dataclasses import dataclass
from pathlib import Path
import struct

import numpy as np


@dataclass
class Camera:
    id: int
    model: str
    width: int
    height: int
    params: np.ndarray


@dataclass
class Image:
    id: int
    qvec: np.ndarray  # (w, x, y, z), world-to-camera
    tvec: np.ndarray  # (3,), world-to-camera
    camera_id: int
    name: str
    xys: np.ndarray | None = None
    point3D_ids: np.ndarray | None = None


CAMERA_MODELS = {
    0: ("SIMPLE_PINHOLE", 3),
    1: ("PINHOLE", 4),
    2: ("SIMPLE_RADIAL", 4),
    3: ("RADIAL", 5),
    4: ("OPENCV", 8),
    5: ("OPENCV_FISHEYE", 8),
    6: ("FULL_OPENCV", 12),
    7: ("FOV", 5),
    8: ("SIMPLE_RADIAL_FISHEYE", 4),
    9: ("RADIAL_FISHEYE", 5),
    10: ("THIN_PRISM_FISHEYE", 12),
}
CAMERA_MODEL_NAME_TO_ID = {name: model_id for model_id, (name, _) in CAMERA_MODELS.items()}


def _read_next_bytes(fid, num_bytes: int, fmt: str):
    data = fid.read(num_bytes)
    if len(data) != num_bytes:
        raise EOFError("unexpected end of file while parsing COLMAP model")
    return struct.unpack("<" + fmt, data)


def _write_next_bytes(fid, data, fmt: str):
    if isinstance(data, (list, tuple, np.ndarray)):
        fid.write(struct.pack("<" + fmt, *data))
    else:
        fid.write(struct.pack("<" + fmt, data))


def qvec2rotmat(qvec: np.ndarray) -> np.ndarray:
    w, x, y, z = np.asarray(qvec, dtype=np.float64)
    n = np.linalg.norm([w, x, y, z])
    if n <= 0:
        raise ValueError("invalid quaternion with zero norm")
    w, x, y, z = (w / n, x / n, y / n, z / n)
    return np.array(
        [
            [1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y - z * w), 2.0 * (x * z + y * w)],
            [2.0 * (x * y + z * w), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z - x * w)],
            [2.0 * (x * z - y * w), 2.0 * (y * z + x * w), 1.0 - 2.0 * (x * x + y * y)],
        ],
        dtype=np.float64,
    )


def write_cameras_binary(cameras: dict[int, Camera], path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("wb") as f:
        _write_next_bytes(f, len(cameras), "Q")
        for _, cam in sorted(cameras.items()):
            model_id = CAMERA_MODEL_NAME_TO_ID.get(cam.model)
            if model_id is None:
                raise ValueError(f"Unsupported camera model for writer: {cam.model}")
            _write_next_bytes(f, [cam.id, model_id, cam.width, cam.height], "iiQQ")
            params = np.asarray(cam.params, dtype=np.float64)
            _write_next_bytes(f, params.tolist(), "d" * len(params))


def read_cameras_binary(path: str | Path) -> dict[int, Camera]:
    cameras: dict[int, Camera] = {}
    with Path(path).open("rb") as f:
        num_cameras = _read_next_bytes(f, 8, "Q")[0]
        for _ in range(num_cameras):
            cam_id, model_id, width, height = _read_next_bytes(f, 24, "iiQQ")
            if model_id not in CAMERA_MODELS:
                raise ValueError(f"Unknown COLMAP camera model id: {model_id}")
            model_name, num_params = CAMERA_MODELS[model_id]
            params = np.array(_read_next_bytes(f, 8 * num_params, "d" * num_params), dtype=np.float64)
            cameras[cam_id] = Camera(
                id=int(cam_id),
                model=model_name,
                width=int(width),
                height=int(height),
                params=params,
            )
    return cameras


def write_images_binary(images: dict[int, Image], path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("wb") as f:
        _write_next_bytes(f, len(images), "Q")
        for _, img in sorted(images.items()):
            qvec = np.asarray(img.qvec, dtype=np.float64).reshape(4)
            tvec = np.asarray(img.tvec, dtype=np.float64).reshape(3)
            _write_next_bytes(f, [img.id, *qvec.tolist(), *tvec.tolist(), img.camera_id], "idddddddi")
            f.write(img.name.encode("utf-8") + b"\x00")
            xys = np.asarray(img.xys, dtype=np.float64) if img.xys is not None else np.zeros((0, 2), dtype=np.float64)
            p3d = np.asarray(img.point3D_ids, dtype=np.int64) if img.point3D_ids is not None else np.zeros((0,), dtype=np.int64)
            if xys.shape[0] != p3d.shape[0]:
                raise ValueError("xys and point3D_ids must have same number of points")
            _write_next_bytes(f, xys.shape[0], "Q")
            for j in range(xys.shape[0]):
                _write_next_bytes(f, [float(xys[j, 0]), float(xys[j, 1]), int(p3d[j])], "ddq")


def read_images_binary(path: str | Path) -> dict[int, Image]:
    images: dict[int, Image] = {}
    with Path(path).open("rb") as f:
        num_images = _read_next_bytes(f, 8, "Q")[0]
        for _ in range(num_images):
            elems = _read_next_bytes(f, 64, "idddddddi")
            image_id = elems[0]
            qvec = np.array(elems[1:5], dtype=np.float64)
            tvec = np.array(elems[5:8], dtype=np.float64)
            camera_id = elems[8]

            name_bytes = bytearray()
            while True:
                c = f.read(1)
                if c == b"":
                    raise EOFError("unexpected EOF while reading image name")
                if c == b"\x00":
                    break
                name_bytes.extend(c)
            name = name_bytes.decode("utf-8")

            num_points2d = _read_next_bytes(f, 8, "Q")[0]
            xys = np.zeros((num_points2d, 2), dtype=np.float64)
            p3d = np.zeros((num_points2d,), dtype=np.int64)
            for j in range(num_points2d):
                x, y, pid = _read_next_bytes(f, 24, "ddq")
                xys[j, 0] = x
                xys[j, 1] = y
                p3d[j] = pid

            images[image_id] = Image(
                id=int(image_id),
                qvec=qvec,
                tvec=tvec,
                camera_id=int(camera_id),
                name=name,
                xys=xys,
                point3D_ids=p3d,
            )
    return images

