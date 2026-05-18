# Free-Roam Generalization Evaluation

## In-distribution (standard test_every=8)

| scene | combined_0.7 | path_aware_v5_linear_falloff | path_aware_v5_pure_sum | path_aware_v5_sqrt_clamp | path_aware_v5_weighted_sum | visibility |
|---|---|---|---|---|---|---|
| counter | nan | 30.397 | 31.970 | 29.790 | 29.716 | 23.300 |
| kitchen | nan | 26.687 | 28.294 | 26.279 | 21.888 | 18.464 |
| room | nan | 36.549 | 37.485 | 36.249 | 36.435 | 29.966 |
| train | nan | 25.324 | 22.799 | 25.398 | 18.070 | 20.629 |
| truck | nan | 28.199 | 28.251 | 28.296 | 20.025 | 20.295 |

## Free-roam (trajectory_half split)

| scene | combined_0.7 | path_aware_v5_linear_falloff | path_aware_v5_pure_sum | path_aware_v5_sqrt_clamp | path_aware_v5_weighted_sum | visibility |
|---|---|---|---|---|---|---|
| counter | 29.752 | 30.972 | 32.129 | nan | nan | 23.334 |
| kitchen | 26.211 | 26.464 | 28.004 | nan | nan | 18.194 |
| room | 34.554 | 37.323 | 37.657 | nan | nan | 31.478 |
| train | 21.783 | 24.706 | 22.593 | nan | nan | 21.318 |
| truck | 23.696 | 28.550 | 28.702 | nan | nan | 19.944 |

## Path-aware advantage degradation

| scene | in_dist_gap | free_roam_gap | delta |
|---|---:|---:|---:|
| counter | 8.670 | 8.795 | 0.124 |
| kitchen | 9.830 | 9.810 | -0.019 |
| room | 7.519 | 6.180 | -1.339 |
| train | 2.170 | 1.275 | -0.894 |
| truck | 7.956 | 8.758 | 0.802 |
