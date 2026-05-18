# PROJECT_STATE

Last updated: 2026-05-18 (UTC+8)  
Scope: `~/projects/effect-size-prestudy` (`/home/lixiuyuan/Workspace/splattransform/experiments/effect-size-prestudy`)

This document is a fact-based snapshot of current project status, artifacts, conclusions, and unresolved questions.

---

## 项目结构（树形，深度<=2）

```text
.
  data/
    fixtures/
    mipnerf360/
    tandt/
  output/
    _archive_pre_fix/
    cache/
    logs/
    paper_bundle/
    sanity/
    visual/
  scripts/
  src/
    baselines/
    io.py
    metrics.py
    pruning.py
    raster_importance.py
    render.py
  tests/
  README.md
  pyproject.toml
  uv.lock
```

---

## 1) 代码状态盘点（`src/pruning.py`）

### 1.1 当前函数总览（自动枚举）

`['_exp_scales', '_infer_scene_scale', '_make_plane', '_rotation_matrix_xyz_deg', '_sigmoid_opacities', '_topk_mask', 'combined_pruning', 'compute_frustum_planes', 'debug_path_aware_components', 'path_aware_importance', 'path_aware_v2_no_sigma', 'path_aware_v3_sqrt_count', 'path_aware_v4_log_count', 'path_aware_v5_linear_falloff', 'path_aware_v5_pure_sum', 'path_aware_v5_sqrt_clamp', 'path_aware_v5_weighted_sum', 'point_in_frustum_batch', 'random_pruning', 'visibility_pruning']`

### 1.2 每个函数状态标注

- `STABLE`
  - `_exp_scales`, `_sigmoid_opacities`, `_topk_mask`
  - `_rotation_matrix_xyz_deg`, `_make_plane`, `compute_frustum_planes`, `point_in_frustum_batch`
  - `random_pruning`, `visibility_pruning`
  - `_infer_scene_scale`
  - `path_aware_importance` (v1 baseline)
  - `path_aware_v5_pure_sum` (当前主力候选)
  - `combined_pruning` (组合基线)
- `EXPERIMENTAL`
  - `path_aware_v5_linear_falloff` (hybrid max+log)
  - `path_aware_v5_sqrt_clamp`
  - `path_aware_v5_weighted_sum`
  - `debug_path_aware_components`（诊断函数）
- `DEBUG_ONLY`
  - `path_aware_v5_linear_falloff(..., _debug_dump_path=...)` 参数分支
  - `path_aware_v5_linear_falloff` 内 `V5_DIAG_HIT_COUNTS` 环境变量打印分支
- `DEPRECATED`
  - `path_aware_v2_no_sigma`, `path_aware_v3_sqrt_count`, `path_aware_v4_log_count`（保留用于历史 sweep 复现）

### 1.3 path-aware 变体状态（公式+使用）

- `path_aware_importance`（v1，平方衰减）
  - 核心：`sum_i visible * (sigma/d)^2 * alpha`
  - 轮次：早期基线，Stage1/Stage3
  - 当前使用：仍可调用；不是默认推荐
- `path_aware_v5_linear_falloff`（hybrid）
  - 核心：`importance = max_i(w*alpha) * log1p(hit_count)`，`w=min(1, sigma/(d/scene_scale))`
  - 轮次：v5演化诊断阶段（max/log、scale-invariant）
  - 当前使用：参与主表对比（`run_effect_size.py` methods）
- `path_aware_v5_pure_sum`
  - 核心：`sum_i visible * w * alpha`（无 max、无 hit_count 放大）
  - 轮次：truck 回归后候选公式 sweep
  - 当前使用：主表候选；目前 mean 最优
- `path_aware_v5_sqrt_clamp`
  - 核心：`max_i(w*alpha) * sqrt(min(hit_count, K))`
  - 轮次：truck 回归后候选公式 sweep
  - 当前使用：主表候选
- `path_aware_v5_weighted_sum`
  - 核心：`max_i(w*alpha) + beta * log1p(hit_count)/log1p(N)`
  - 轮次：truck 回归后候选公式 sweep
  - 当前使用：主表候选（表现明显较差）
- `path_aware_v2_no_sigma / v3_sqrt_count / v4_log_count`
  - 核心：剥离或替代 sigma/d 结构的历史中间版本
  - 轮次：Stage3 公式 sweep
  - 当前使用：历史对照，不建议新实验继续主用

### 1.4 临时参数残留检查

- `_debug_dump_path`：存在（`path_aware_v5_linear_falloff`）
- 结论：确有临时诊断入口残留，属于 `DEBUG_ONLY`

### 1.5 TODO/FIXME/DEBUG/TEMP 标记扫描（`src/` + `scripts/`）

- 扫描结果：**无匹配**
- 说明：当前没有显式字符串标记；调试分支以参数/环境变量形式存在

---

## 2) 数据产物状态盘点（按时间/可信度）

Legend:
- `trusted`: 当前协议与结论一致，可直接引用
- `questionable`: 诊断类中间产物，需结合上下文解释
- `known-bad`: 已被后续定位为协议或管线问题导致，不应再用于结论

### 2.1 2026-05-17 早期/中期产物

- `output/sanity.png`, `output/effect_size_plot.png`  
  - Stage: 早期 sanity  
  - Status: `questionable`（历史调试，不用于最终结论）
- `output/STAGE2_DIAGNOSIS.md`  
  - Stage2 诊断报告  
  - Status: `trusted`（历史问题定位上下文）
- `output/formula_sweep.csv`, `output/STAGE3_REPORT.md`  
  - Stage3 公式 sweep（kitchen 主体）  
  - Status: `trusted`（限定于对应协议/范围）
- `output/sparse_capture_{kitchen,room,counter}.csv`, `output/sparse_keep_ratio_sweep.csv/.png`, `output/timing.csv`
  - Stage3/Step4&5  
  - Status: `trusted`
- `output/lambda_sweep_kitchen.csv/.png`, `output/lambda_sweep_kitchen_metrics.png`
  - lambda sweep  
  - Status: `trusted`
- `output/paper_bundle/*`
  - 打包快照（同 Stage3）  
  - Status: `trusted`（历史快照）
- `output/_archive_pre_fix/*`
  - pre-fix 归档  
  - Status: `known-bad`（显式归档，不用于当前结论）

### 2.2 2026-05-18 诊断与修复产物

- `output/debug_kitchen_real_path.npz`, `output/debug_truck_real_path.npz`
  - 真实路径中间量 dump（importance/hit_count/max_w_alpha/sigma）  
  - Status: `questionable`（诊断专用，不直接作论文主结果）
- `output/visual/truck_*.png`, `output/visual/truck_*_trainpose0.png`, `output/visual/truck_worst18_*.png`
  - 可视化诊断图  
  - Status: `questionable`（现象证据）
- `output/sanity/truck_baseline.png`, `output/sanity/train_baseline.png`
  - T&T baseline sanity  
  - Status: `questionable`（配合主表使用）

### 2.3 当前主表相关核心文件（最新）

- `output/effect_size_kitchen.csv`
- `output/effect_size_room.csv`
- `output/effect_size_counter.csv`
- `output/effect_size_truck.csv`
- `output/effect_size_train.csv`
- `output/effect_size_all.csv`
- `output/effect_size_summary.png`
- `output/STAGE4_TANDT.md`

Stage: 新协议 5-scene 主表（keep=0.5）  
参数: `path_use_pose_meta=False, path_near=0.1, path_far=150.0, path_aspect=16/9`  
Status: `trusted`

### 2.4 cache 状态（`output/cache/`）

包含多份 `*_full_test_render_*.npy`（kitchen/room/counter/truck/train）和历史 `full_render_*.npy`。  
用途: full render 缓存以加速评测。  
Status: `questionable`（可复用但不应单独当结论证据；重算时可清理）。

### 2.5 关于“truck=14.89”的状态标注

- 历史现象：`truck path_aware_v5_pure_sum @ keep=0.5` 出现过 `14.8887 dB`
- 结论：已定位为**评测协议不一致**（path frustum 使用 pose-meta 的 `far≈7.97`）导致，非算法真实退化。
- 当前文件状态：
  - 最新 `output/effect_size_truck.csv` 已为新协议结果（`~28.25 dB`），不再含该坏值。
  - `14.89` 作为历史诊断结论应标记 `known-bad`，仅保留为“错误来源定位”证据。

---

## 3) 实验结果时间线（按时间）

> 时间取自产物 mtime 与执行记录，统一到本地时区（UTC+8）近似表达。

1. **[2026-05-17 01:xx] Stage 1: 6/15 prestudy 启动（kitchen）**  
   - Scope: effect-size 初始流程与 sanity  
   - Outcome: 管线可运行  
   - Status: `SUPERSEDED`  
   - Artifacts: `output/sanity.png`, `output/effect_size_plot.png`  
   - Notes: 早期结果后续被多轮修复替代

2. **[2026-05-17 21:xx] Stage 2: visibility/decode 相关修复阶段**  
   - Scope: pruning 输入解码链路与可见性诊断  
   - Outcome: 排除/修复基础实现问题  
   - Status: `VERIFIED`  
   - Artifacts: `output/STAGE2_DIAGNOSIS.md`

3. **[2026-05-17 22:xx] Stage 3: 公式 sweep（v1/v2/v3/v4/v5）**  
   - Scope: kitchen + sparse/dense + keep ratio/lambda  
   - Outcome: v5 family 优于早期变体  
   - Status: `VERIFIED`（限对应协议）  
   - Artifacts: `output/formula_sweep.csv`, `output/STAGE3_REPORT.md`, `output/paper_bundle/*`

4. **[2026-05-18 01:xx~02:xx] Tanks & Temples 纳入（truck/train）**  
   - Scope: T&T 场景评测与 sanity 图  
   - Outcome: 初看 truck 出现严重回归  
   - Status: `SUPERSEDED`  
   - Artifacts: `output/sanity/truck_baseline.png`, `output/sanity/train_baseline.png`

5. **[2026-05-18 03:xx~04:xx] 公式演化（linear -> max -> hybrid）与诊断脚本**  
   - Scope: v5 聚合形态迭代、hit_count/floater/pose consistency 诊断  
   - Outcome: 形成多个候选公式，但 truck 异常仍在  
   - Status: `SUPERSEDED`  
   - Artifacts: `output/STAGE4_POSE_CONSISTENCY.md`, `output/debug_*_real_path.npz`

6. **[2026-05-18 03:xx~04:xx] 5-scene checkpoint（出现 truck 回归）**  
   - Scope: 5 场景主表 checkpoint  
   - Outcome: truck 显示异常低值，触发进一步排查  
   - Status: `INVALIDATED`（后证实为协议不一致）  
   - Artifacts: 历史 checkpoint 结论（非当前主表）

7. **[2026-05-18 04:xx] 4-candidate sweep（pure_sum/sqrt_clamp/weighted/hybrid）**  
   - Scope: keep=0.5 候选公式对比  
   - Outcome: 在旧协议下都受 truck 影响  
   - Status: `INVALIDATED`（因协议问题）  
   - Artifacts: 历史 `effect_size_*.csv`（已被后续复跑覆盖）

8. **[2026-05-18 05:xx] per-pose PSNR 诊断（关键）**  
   - Scope: truck 与 kitchen 逐 pose 可视化+PSNR  
   - Outcome: 直接渲染显示 truck path-aware 实际很强（~28.25）  
   - Status: `VERIFIED`
   - Artifacts: `output/visual/truck_*.png`, `output/visual/truck_worst18_*.png`

9. **[2026-05-18 05:xx~06:xx] 根因定位：run_effect 协议差异**  
   - Scope: run_effect 路径 vs direct 调用逐项对比  
   - Outcome: 锁定 near/far/aspect 参数来源不一致（pose-meta vs 默认）  
   - Status: `VERIFIED`
   - Artifacts: 修复后的 `scripts/run_effect_size.py` + CSV 新字段

10. **[2026-05-18 18:xx] 新协议主表重跑（当前基线）**  
    - Scope: 5-scene keep=0.5，visibility + 4 path-aware 方法  
    - Outcome: 主力 path-aware 全面优于 visibility，truck 恢复  
    - Status: `VERIFIED`
    - Artifacts: `output/effect_size_all.csv`, `output/effect_size_{scene}.csv`, `output/effect_size_summary.png`, `output/STAGE4_TANDT.md`

---

## 4) 结论清单

## VERIFIED（可写入论文，基于当前干净协议）

- 评测协议统一后（`path_use_pose_meta=False`, `far=150`），truck 不存在 14.89 崩塌。  
  - Evidence: `output/effect_size_truck.csv`（`path_aware_v5_pure_sum=28.2513`, visibility=20.2948）
- 5-scene keep=0.5 下，path-aware 主力方法显著优于 visibility。  
  - Evidence: `output/effect_size_all.csv`
- `path_aware_v5_pure_sum` 在当前主表中 mean PSNR 最高。  
  - Evidence: `output/effect_size_all.csv`, `output/STAGE4_TANDT.md`
- decode/反变换链路问题（raw vs linear）是历史关键 bug，修复后结果显著稳定。  
  - Evidence: `output/STAGE2_DIAGNOSIS.md`, `output/STAGE3_REPORT.md`

## OPEN QUESTIONS（待决策/待实验）

- 是否继续采用固定 frustum（150/16:9）作为论文主协议，还是报告 pose-meta 协议对比附录。  
  - Evidence: `scripts/run_effect_size.py` 新增参数与 CSV 字段
- 是否扩展到 free-roam/generalization（超出 train 轨迹）以验证外推能力。  
  - Evidence: 当前仅标准 split，尚无 free-roam 结果
- 是否清理 `DEBUG_ONLY` 残留（`_debug_dump_path`, `V5_DIAG_HIT_COUNTS`）后再冻结版本。  
  - Evidence: `src/pruning.py`

## INVALIDATED（已推翻，避免重复走弯路）

- “truck 失败由 max-pooling floater 误选导致”  
  - 结论：推翻（floater 占比极低，不能解释 13dB 级差异）  
  - Evidence: 诊断输出 + `debug_*_real_path.npz`
- “truck train/test split 偏离导致失败”  
  - 结论：推翻（位置/朝向统计与 kitchen 同量级）  
  - Evidence: pose distribution 诊断输出
- “14.89 是算法本体退化”  
  - 结论：推翻（协议参数不一致导致）  
  - Evidence: 同 mask 条件下，仅 `far`/`aspect` 参数切换即可在 14.89 与 28.25 间切换

---

## 已知 bug（当前仍需处理或已定位）

1. **已定位并已修复**：评测协议不一致（path-aware 使用 pose-meta frustum 导致 truck 低估）  
   - 修复位置：`scripts/run_effect_size.py`（新增 `--path-use-pose-meta` + 显式 `path_near/far/aspect`）
   - 当前默认：统一固定协议（False + 0.1/150/16:9）

2. **残留调试接口（非功能 bug）**：`src/pruning.py` 中 `_debug_dump_path` 与 `V5_DIAG_HIT_COUNTS` 分支  
   - 风险：污染最终代码整洁度
   - 建议：发布前清理或转移至独立 debug utility

---

## 已推翻的假设（专章）

- 假设A：truck 回归由 split 偏移引起 -> **推翻**
- 假设B：truck 回归由 floater 主导引起 -> **推翻**
- 假设C：truck 回归由 aggregation 公式本体引起 -> **部分推翻**  
  - 解释：公式会影响结果，但“14.89 极端低值”主要由协议参数不一致触发，不是公式本体唯一原因

---

## 5) 当前文件 manifest（关键文件）

### 代码
- `src/pruning.py`：多公式并存，含 DEBUG_ONLY 分支（见上）
- `scripts/run_effect_size.py`：已加入 path frustum 协议参数化
- `src/render.py`：CUDA gsplat 渲染入口
- `src/io.py`：PLY 加载

### 数据/报告
- 主结果：`output/effect_size_all.csv`, `output/effect_size_{scene}.csv`, `output/effect_size_summary.png`
- 阶段报告：`output/STAGE2_DIAGNOSIS.md`, `output/STAGE3_REPORT.md`, `output/STAGE4_TANDT.md`
- 诊断证据：`output/debug_*.npz`, `output/visual/*.png`
- 历史归档：`output/_archive_pre_fix/*`（known-bad）

---

## 6) 下一步选项（决策树）

### Option A: 直接写 VRCAI full paper（基于 VERIFIED）
- Prerequisite:
  - 确认主协议：`path_use_pose_meta=False` 固化
  - 清理/标注 DEBUG_ONLY 残留
- Estimated effort:
  - 1~2 天整理图表 + 报告整合
- 风险:
  - 审稿可能询问 pose-meta 协议差异，需要附录说明

### Option B: 先修整代码并补齐协议对比，再写 paper（推荐）
- Prerequisite:
  - 清理 `src/pruning.py` debug 分支
  - 补一组 `--path-use-pose-meta` 对照表附录
- Estimated effort:
  - 1 天工程整理 + 0.5~1 天补实验/附录
- 收益:
  - 结果可复现性和叙事完整性更强

### Option C: 升级到 free-roam generalization 方向
- Prerequisite:
  - 新增 free-roam pose 采样与协议
  - 重跑多场景实验
- Estimated effort:
  - 3~5 天（含实验与分析）
- 风险:
  - 可能引入新的评测维度与不确定性

---

## 7) Git 状态盘点（当前工作树）

- `git status`: **dirty**（大量未跟踪文件）
- `git log --oneline -20`: 当前可见最近 6 条提交（多为 `splat-transform-fork` 相关）
- `git tag --list`: 无 tag

最近 5 条 commit（oneline）:
- `d73317a feat(action): filterByPath WebGPU compute path (v5)`
- `189fd12 test(crossref): add repo-local overlap checker script`
- `070015a test(crossref): py↔ts agreement on 1k-Gaussian fixture`
- `f8dc9d6 feat(action): filterByPath v5 linear-falloff CPU implementation`
- `4f68795 feat(types): add filterByPath/lodBudgetPlan/emitManifest stubs`

当前 dirty 主要是顶层仓库未跟踪内容（含 `experiments/` 整体）。

### 建议（不自动执行）

- 应该 revert/清理：
  - `src/pruning.py` 的 DEBUG_ONLY 参数和环境变量打印分支
- 应该 commit：
  - `scripts/run_effect_size.py` 协议参数化修复
  - `output/STAGE4_TANDT.md` 更新后的主表结论
  - （可选）`PROJECT_STATE.md`
- 建议新 tag：
  - `phase1-summary`（在清理 debug 后打）

---

## 8) 快速复现命令（当前主结果）

```bash
cd ~/projects/effect-size-prestudy
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

Expected: `output/effect_size_all.csv` with `path_use_pose_meta=False` rows and truck path-aware around `28 dB`.

