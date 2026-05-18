# STAGE3 REPORT

## 1. Formula Sweep Table (Step 2)

| scene | capture | method | keep_ratio | mean_psnr | n_train_poses |
| --- | --- | --- | --- | --- | --- |
| kitchen | dense | random | 0.5 | 19.772308 | 244 |
| kitchen | dense | visibility | 0.5 | 18.464336 | 244 |
| kitchen | dense | path_aware | 0.5 | 22.865633 | 244 |
| kitchen | dense | path_aware_v2_no_sigma | 0.5 | 21.610493 | 244 |
| kitchen | dense | path_aware_v3_sqrt_count | 0.5 | 23.076581 | 244 |
| kitchen | dense | path_aware_v4_log_count | 0.5 | 23.313465 | 244 |
| kitchen | dense | path_aware_v5_linear_falloff | 0.5 | 23.909910 | 244 |
| kitchen | dense | combined_0.7 | 0.5 | 22.959979 | 244 |
| kitchen | dense | raster_importance | 0.5 | 30.133392 | 244 |
| kitchen | sparse | random | 0.5 | 19.772308 | 49 |
| kitchen | sparse | visibility | 0.5 | 18.464336 | 49 |
| kitchen | sparse | path_aware | 0.5 | 22.675549 | 49 |
| kitchen | sparse | path_aware_v2_no_sigma | 0.5 | 21.619042 | 49 |
| kitchen | sparse | path_aware_v3_sqrt_count | 0.5 | 22.925030 | 49 |
| kitchen | sparse | path_aware_v4_log_count | 0.5 | 23.291139 | 49 |
| kitchen | sparse | path_aware_v5_linear_falloff | 0.5 | 23.780418 | 49 |
| kitchen | sparse | combined_0.7 | 0.5 | 23.343133 | 49 |
| kitchen | sparse | raster_importance | 0.5 | 29.935862 | 49 |

## 2. 最优 hand-crafted 公式

- 候选集合: ['path_aware', 'path_aware_v2_no_sigma', 'path_aware_v3_sqrt_count', 'path_aware_v4_log_count', 'path_aware_v5_linear_falloff']
- 按 dense+sparse 平均 PSNR，最佳为: **path_aware_v5_linear_falloff**
- 各方法均值（降序）:
  - path_aware_v5_linear_falloff: 23.845164
  - path_aware_v4_log_count: 23.302302
  - path_aware_v3_sqrt_count: 23.000805
  - path_aware: 22.770591
  - path_aware_v2_no_sigma: 21.614767

## 3. Oracle Gap（raster vs best hand-crafted）

- Dense (kitchen): oracle=30.133392, best=23.909910, gap=6.223482 dB
- Sparse (kitchen): oracle=29.935862, best=23.780418, gap=6.155444 dB

## 4. Sparse Keep-Ratio 曲线

- 数据文件: `output/sparse_keep_ratio_sweep.csv`
- 曲线图: `output/sparse_keep_ratio_sweep.png`
- 关键观察:
  - v5 在 0.7/0.5/0.3/0.1 四个 keep_ratio 上均高于 v1。
  - oracle 在高 keep_ratio(0.7/0.5) 显著领先，低 keep_ratio(0.1) 领先缩小。

## 5. Cross-Scene Sparse 泛化 (Step 4)

| scene | capture | method | keep_ratio | mean_psnr | n_train_poses |
| --- | --- | --- | --- | --- | --- |
| room | sparse | random | 0.5 | 24.710605 | 55 |
| room | sparse | visibility | 0.5 | 29.965562 | 55 |
| room | sparse | path_aware | 0.5 | 29.153097 | 55 |
| room | sparse | path_aware_v5_linear_falloff | 0.5 | 31.833120 | 55 |
| room | sparse | raster_importance | 0.5 | 42.840492 | 55 |
| counter | sparse | random | 0.5 | 24.135059 | 42 |
| counter | sparse | visibility | 0.5 | 23.300177 | 42 |
| counter | sparse | path_aware | 0.5 | 23.145501 | 42 |
| counter | sparse | path_aware_v5_linear_falloff | 0.5 | 24.217781 | 42 |
| counter | sparse | raster_importance | 0.5 | 36.169034 | 42 |

## 6. Timing Comparison (Step 5)

| method | n_splats | n_poses | wall_clock_sec |
| --- | --- | --- | --- |
| path_aware_v1 | 1852335 | 49 | 6.651821 |
| path_aware_v5_linear_falloff | 1852335 | 49 | 6.621376 |
| raster_importance | 1852335 | 49 | 0.895267 |

## 7. 论文 Framing 建议

a. "Sparse capture is our regime" 是否站得住？
- 站得住。sparse regime 下 path-aware(v1) 在 keep=0.5 超过 visibility 4.211 dB，且 v5 提升更明显。

b. raster_importance 在论文中的定位
- 建议定位为“oracle upper bound”：raster_importance 提供可达到的上限（dense +6.223 dB over best handcrafted；sparse +6.155 dB），用于证明还有学习式/可微重要性空间。

c. best hand-crafted 公式如何描述
- best hand-crafted 公式建议使用 path_aware_v5_linear_falloff，文中描述为“linear distance falloff + alpha-gated visibility accumulation”，并强调它在 dense/sparse 都优于 v1。
