# STAGE2 DIAGNOSIS

## 1) Dense Capture（Phase A 后，kitchen keep_ratio=0.5）

| method | mean_psnr |
| --- | ---: |
| random | 19.458809 |
| visibility | 18.464336 |
| path_aware | 16.327949 |
| combined_0.7 | 16.339383 |
| raster_importance | 30.133392 |

- path_gap (path_aware - visibility): -2.136388 dB
- comb_gap (combined - visibility): -2.124954 dB

## 2) Step 1 Diagnostic（path_aware 组件分解）

| component | mean_psnr |
| --- | ---: |
| visibility_only_count | 14.361001 |
| sigma_falloff | 19.579580 |
| alpha_only | 21.610493 |
| full (current) | 22.865633 |

- 观察：在该设置下，`full (current)` > `alpha_only` > `sigma_falloff` >> `visibility_only_count`。

## 3) Step 2 Raster Importance（path-aware 上限）

- raster_importance (dense, kitchen, keep_ratio=0.5): **30.133392 dB**
- 相对 visibility 提升: **11.669056 dB**
- 相对 current path_aware 提升: **13.805443 dB**

## 4) Step 3 Sparse Capture（kitchen train stride=5，49 poses）

| method | mean_psnr |
| --- | ---: |
| random | 19.772308 |
| visibility | 18.464336 |
| path_aware | 22.675549 |
| combined_0.7 | 23.343133 |
| raster_importance | 29.935862 |

- sparse path_gap (path_aware - visibility): 4.211213 dB
- sparse comb_gap (combined_0.7 - visibility): 4.878797 dB

## Verdict

**Verdict A**

raster_importance 在 dense capture 上显著高于 visibility (>= +1.5 dB)。 说明 path-aware 思路成立，但当前 hand-crafted 公式次优，应升级 importance 定义并重跑全实验。
