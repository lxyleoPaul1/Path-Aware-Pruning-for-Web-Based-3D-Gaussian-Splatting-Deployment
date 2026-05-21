# Benchmark scene data (5 scenes)

Assets for `run_effect_size.py` — **stored with Git LFS** (~2.3 GB total).

## Layout

| Scene   | Dataset         | Path |
|---------|-----------------|------|
| kitchen | MiP-NeRF 360     | `mipnerf360/kitchen/` |
| room    | MiP-NeRF 360     | `mipnerf360/room/` |
| counter | MiP-NeRF 360     | `mipnerf360/counter/` |
| truck   | Tanks & Temples  | `tandt/truck/` |
| train   | Tanks & Temples  | `tandt/train/` |

Per scene: `point_cloud.ply`, COLMAP `*.bin`, `poses_train.json` / `poses_test.json`, optional `poses_train_sparse.json` (kitchen), `poses_*_trajectory_half.json`.

## Restore locally

```bash
cd experiments/effect-size-prestudy
bash scripts/setup_benchmark_data.sh   # download + layout (needs ~20 GB disk during setup)
```

After clone from GitHub:

```bash
git lfs install && git lfs pull
```

## Licenses

MiP-NeRF 360 and Tanks & Temples retain upstream terms; see their project pages before redistribution.
