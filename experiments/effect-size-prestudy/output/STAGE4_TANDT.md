# STAGE4 Main Table (Default New Protocol)

This report is re-generated after fixing the path-aware frustum protocol mismatch in `run_effect_size.py`.

Default path-aware protocol (now explicit):

- `path_use_pose_meta = False`
- `path_near = 0.1`
- `path_far = 150.0`
- `path_aspect = 16/9`

Reproduction command:

```bash
PYTHONPATH=. uv run python scripts/run_effect_size.py \
  --scenes kitchen room counter truck train \
  --methods visibility \
            path_aware_v5_linear_falloff \
            path_aware_v5_pure_sum \
            path_aware_v5_sqrt_clamp \
            path_aware_v5_weighted_sum \
  --keep_ratios 0.5 \
  --no-lambda-sweep \
  --force-scene-recompute
```

Outputs:

- `output/effect_size_all.csv`
- `output/effect_size_{kitchen,room,counter,truck,train}.csv`
- `output/effect_size_summary.png`

## Keep Ratio 0.5 Main Table

| scene | visibility | path_aware_v5_linear_falloff | path_aware_v5_pure_sum | path_aware_v5_sqrt_clamp | path_aware_v5_weighted_sum |
|---|---:|---:|---:|---:|---:|
| kitchen | 18.4643 | 26.6869 | 28.2941 | 26.2793 | 21.8885 |
| room | 29.9656 | 36.5488 | 37.4848 | 36.2489 | 36.4347 |
| counter | 23.3002 | 30.3969 | 31.9703 | 29.7904 | 29.7159 |
| truck | 20.2948 | 28.1985 | 28.2513 | 28.2955 | 20.0250 |
| train | 20.6293 | 25.3242 | 22.7990 | 25.3983 | 18.0701 |
| **mean** | **22.5308** | **29.4311** | **29.7609** | **29.2025** | **25.2268** |

## Gap vs Visibility (dB)

- `path_aware_v5_linear_falloff`: mean `+6.9002`, worst-scene `+4.6949`, truck `+7.9037`
- `path_aware_v5_pure_sum`: mean `+7.2290`, worst-scene `+2.1697`, truck `+7.9565`
- `path_aware_v5_sqrt_clamp`: mean `+6.6716`, worst-scene `+4.7690`, truck `+8.0007`
- `path_aware_v5_weighted_sum`: mean `+2.6960`, worst-scene `-2.5592`, truck `-0.2698`

## Observation

- The previous `truck ~14.89 dB` collapse was a protocol artifact (pose-metadata frustum with `far≈7.97`), not an intrinsic failure of path-aware scoring.
- Under the default unified protocol, all three main path-aware variants (`linear_falloff`, `pure_sum`, `sqrt_clamp`) strongly outperform visibility on all 5 scenes.
- By mean PSNR at keep=0.5, `path_aware_v5_pure_sum` is currently best among the tested variants.
