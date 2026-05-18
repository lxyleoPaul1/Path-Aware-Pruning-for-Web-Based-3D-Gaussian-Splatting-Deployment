from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
import sys

import numpy as np
import torch
from gsplat import rasterization
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.io import load_ply


def _resolve_scene_dir(data_root: Path, scene_name: str) -> Path:
    candidates = [
        data_root / "mipnerf360" / scene_name,
        data_root / "tandt" / scene_name,
        data_root / scene_name,
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]


def _pose_fov_deg(pose: dict) -> float:
    if "fov_deg" in pose:
        return float(pose["fov_deg"])
    if "fov_degrees" in pose:
        return float(pose["fov_degrees"])
    raise KeyError("pose must contain 'fov_deg' or 'fov_degrees'")


def _decode_opacity(raw: np.ndarray) -> np.ndarray:
    x = np.asarray(raw, dtype=np.float64)
    return np.where(x >= 0.0, 1.0 / (1.0 + np.exp(-x)), np.exp(x) / (1.0 + np.exp(x)))


def _build_k(width: int, height: int, fov_x_deg: float) -> np.ndarray:
    cx = 0.5 * float(width - 1)
    cy = 0.5 * float(height - 1)
    fx = 0.5 * float(width) / math.tan(math.radians(float(fov_x_deg)) * 0.5)
    fy = fx
    return np.array([[fx, 0.0, cx], [0.0, fy, cy], [0.0, 0.0, 1.0]], dtype=np.float32)


def _camera_view_from_pose(pose: dict, width: int, height: int, device: torch.device) -> tuple[torch.Tensor, torch.Tensor]:
    pos = np.asarray(pose["position"], dtype=np.float64)
    rot = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
    r_wc = Rotation.from_euler("xyz", rot, degrees=True).as_matrix()
    r_cw = r_wc.T
    t_cw = -r_cw @ pos
    view = np.eye(4, dtype=np.float32)
    view[:3, :3] = r_cw.astype(np.float32)
    view[:3, 3] = t_cw.astype(np.float32)
    k = _build_k(width, height, _pose_fov_deg(pose))
    view_t = torch.from_numpy(view[None]).to(device=device, dtype=torch.float32)
    k_t = torch.from_numpy(k[None]).to(device=device, dtype=torch.float32)
    return view_t, k_t


def _normalize_plane(nx: float, ny: float, nz: float, px: float, py: float, pz: float) -> np.ndarray:
    n = np.array([nx, ny, nz], dtype=np.float64)
    n = n / (np.linalg.norm(n) + 1e-12)
    d = -float(np.dot(n, np.array([px, py, pz], dtype=np.float64)))
    return np.array([n[0], n[1], n[2], d], dtype=np.float64)


def _compute_planes_variant(
    pose: dict,
    near: float,
    far: float,
    aspect: float,
    euler_order: str,
    basis_mode: str,
    forward_sign: int,
) -> np.ndarray:
    pos = np.asarray(pose["position"], dtype=np.float64)
    euler = np.asarray(pose["rotation_euler_deg"], dtype=np.float64)
    fov = _pose_fov_deg(pose)
    r_wc = Rotation.from_euler(euler_order, euler, degrees=True).as_matrix()

    if basis_mode == "cols":
        right = r_wc[:, 0]
        up = r_wc[:, 1]
        forward = r_wc[:, 2] * float(forward_sign)
    elif basis_mode == "rows":
        right = r_wc[0, :]
        up = r_wc[1, :]
        forward = r_wc[2, :] * float(forward_sign)
    else:
        raise ValueError(f"unknown basis_mode: {basis_mode}")

    tan_y = math.tan(math.radians(fov) * 0.5)
    tan_x = tan_y * aspect

    near_plane = _normalize_plane(
        forward[0], forward[1], forward[2],
        pos[0] + forward[0] * near, pos[1] + forward[1] * near, pos[2] + forward[2] * near
    )
    far_plane = _normalize_plane(
        -forward[0], -forward[1], -forward[2],
        pos[0] + forward[0] * far, pos[1] + forward[1] * far, pos[2] + forward[2] * far
    )

    basis = np.stack([right, up, forward], axis=1)
    left_n = basis @ np.array([1.0, 0.0, tan_x], dtype=np.float64)
    right_n = basis @ np.array([-1.0, 0.0, tan_x], dtype=np.float64)
    bottom_n = basis @ np.array([0.0, 1.0, tan_y], dtype=np.float64)
    top_n = basis @ np.array([0.0, -1.0, tan_y], dtype=np.float64)

    left_plane = _normalize_plane(left_n[0], left_n[1], left_n[2], pos[0], pos[1], pos[2])
    right_plane = _normalize_plane(right_n[0], right_n[1], right_n[2], pos[0], pos[1], pos[2])
    bottom_plane = _normalize_plane(bottom_n[0], bottom_n[1], bottom_n[2], pos[0], pos[1], pos[2])
    top_plane = _normalize_plane(top_n[0], top_n[1], top_n[2], pos[0], pos[1], pos[2])
    return np.stack([near_plane, far_plane, left_plane, right_plane, bottom_plane, top_plane], axis=0)


def _visible_mask(points: np.ndarray, planes: np.ndarray) -> np.ndarray:
    s = points @ planes[:, :3].T + planes[:, 3][None, :]
    return np.all(s >= 0.0, axis=1)


@dataclass
class Score:
    euler_order: str
    basis_mode: str
    forward_sign: int
    tp: int
    fp: int
    fn: int
    precision: float
    recall: float
    f1: float
    visible_count: int
    hit_count: int


def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnose render/frustum pose convention consistency.")
    parser.add_argument("--scene", required=True, help="Scene name, e.g. kitchen/train")
    parser.add_argument("--pose-index", type=int, default=0)
    parser.add_argument("--width", type=int, default=800)
    parser.add_argument("--height", type=int, default=450)
    parser.add_argument("--data-root", type=Path, default=Path("data"))
    parser.add_argument("--topk", type=int, default=10)
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("diagnose_pose_consistency requires CUDA")

    scene_dir = _resolve_scene_dir(args.data_root, args.scene)
    ply_path = scene_dir / "point_cloud.ply"
    poses_path = scene_dir / "poses_train.json"
    if not ply_path.exists() or not poses_path.exists():
        raise FileNotFoundError(f"missing scene assets under {scene_dir}")

    payload = json.loads(poses_path.read_text(encoding="utf-8"))
    poses = payload["poses"]
    pose = poses[int(args.pose_index)]
    near = float(payload.get("near_plane", payload.get("near", 0.1)))
    far = float(payload.get("far_plane", payload.get("far", 150.0)))
    aspect = float(payload.get("aspect_ratio", payload.get("aspect", 16 / 9)))

    data = load_ply(ply_path)
    positions = np.asarray(data["positions"], dtype=np.float32)
    scales = np.exp(np.asarray(data["scales"], dtype=np.float32))
    rotations = np.asarray(data["rotations"], dtype=np.float32)
    opacities = _decode_opacity(np.asarray(data["opacities"], dtype=np.float32)).astype(np.float32)
    colors = np.asarray(data["colors"], dtype=np.float32)

    device = torch.device("cuda")
    viewmats, ks = _camera_view_from_pose(pose, args.width, args.height, device)
    means_t = torch.from_numpy(positions).to(device=device, dtype=torch.float32)
    scales_t = torch.from_numpy(scales).to(device=device, dtype=torch.float32)
    quats_t = torch.from_numpy(rotations).to(device=device, dtype=torch.float32)
    op_t = torch.from_numpy(opacities).to(device=device, dtype=torch.float32)
    colors_t = torch.from_numpy(colors).to(device=device, dtype=torch.float32)

    _rgb, _alpha, meta = rasterization(
        means=means_t,
        quats=quats_t,
        scales=scales_t,
        opacities=op_t,
        colors=colors_t,
        viewmats=viewmats,
        Ks=ks,
        width=int(args.width),
        height=int(args.height),
        sh_degree=None,
        render_mode="RGB",
        packed=True,
    )
    hit_ids = np.unique(meta["gaussian_ids"].detach().cpu().numpy().astype(np.int64))
    hit_mask = np.zeros((positions.shape[0],), dtype=bool)
    hit_mask[hit_ids] = True

    orders = ["xyz", "xzy", "yxz", "yzx", "zxy", "zyx"]
    basis_modes = ["cols", "rows"]
    fsigns = [1, -1]
    scores: list[Score] = []
    for order in orders:
        for basis_mode in basis_modes:
            for fs in fsigns:
                planes = _compute_planes_variant(
                    pose=pose,
                    near=near,
                    far=far,
                    aspect=aspect,
                    euler_order=order,
                    basis_mode=basis_mode,
                    forward_sign=fs,
                )
                vis_mask = _visible_mask(positions.astype(np.float64), planes)
                tp = int(np.sum(vis_mask & hit_mask))
                fp = int(np.sum(vis_mask & (~hit_mask)))
                fn = int(np.sum((~vis_mask) & hit_mask))
                precision = tp / (tp + fp + 1e-12)
                recall = tp / (tp + fn + 1e-12)
                f1 = 2 * precision * recall / (precision + recall + 1e-12)
                scores.append(
                    Score(
                        euler_order=order,
                        basis_mode=basis_mode,
                        forward_sign=fs,
                        tp=tp,
                        fp=fp,
                        fn=fn,
                        precision=precision,
                        recall=recall,
                        f1=f1,
                        visible_count=int(np.sum(vis_mask)),
                        hit_count=int(np.sum(hit_mask)),
                    )
                )

    scores.sort(key=lambda s: (s.f1, s.recall, s.precision), reverse=True)
    print(f"scene={args.scene} pose_index={args.pose_index} hits={int(np.sum(hit_mask))} total={positions.shape[0]}")
    print("top conventions:")
    for s in scores[: max(1, int(args.topk))]:
        print(
            f"  order={s.euler_order:>3} basis={s.basis_mode:>4} fsign={s.forward_sign:+d} "
            f"f1={s.f1:.4f} recall={s.recall:.4f} precision={s.precision:.4f} "
            f"tp={s.tp} fp={s.fp} fn={s.fn} vis={s.visible_count} hit={s.hit_count}"
        )

    current = next(
        s for s in scores
        if s.euler_order == "xyz" and s.basis_mode == "cols" and s.forward_sign == 1
    )
    best = scores[0]
    print("\ncurrent_convention (xyz, cols, +forward):")
    print(
        f"  f1={current.f1:.4f} recall={current.recall:.4f} precision={current.precision:.4f} "
        f"tp={current.tp} fp={current.fp} fn={current.fn}"
    )
    print("best_convention:")
    print(
        f"  order={best.euler_order} basis={best.basis_mode} fsign={best.forward_sign:+d} "
        f"f1={best.f1:.4f} recall={best.recall:.4f} precision={best.precision:.4f}"
    )


if __name__ == "__main__":
    main()
