# Path-Aware Pruning for Web-Based 3DGS Deployment

This repository contains the code, experiments, and paper assets for a VRCAI 2026 research project on **path-aware pruning for 3D Gaussian Splatting (3DGS)**. The goal is to make large 3DGS scenes easier to deploy on the web by pruning splats according to expected camera trajectories before packaging them for PlayCanvas/SOG-style viewers.

## Motivation

3D Gaussian Splatting can produce high-quality real-time rendering, but full trained scenes often contain millions of Gaussians. This creates practical bottlenecks for browser delivery:

- high transfer size for web and mobile users;
- high GPU memory pressure in WebGL/WebGPU viewers;
- unnecessary splats for guided tours or constrained navigation paths;
- hard-to-port compression methods that depend on a specific renderer or training loop.

This project studies a lightweight **export-time** alternative: compute a closed-form importance score from camera paths and splat attributes, keep the top-ranked Gaussians, and package the result for web deployment.

## Core Idea

For each Gaussian \(g_j\), the path-aware score accumulates contribution over an expected pose sequence:

\[
I(g_j)=\sum_i \mathbf{1}[g_j \in F_i]\cdot \min(1,\sigma_j/d_{ij})\cdot \alpha_j
\]

where:

- \(F_i\) is the frustum of pose \(i\);
- \(d_{ij}\) is distance from the camera to the Gaussian center;
- \(\sigma_j\) is a scale proxy from decoded 3DGS scales;
- \(\alpha_j\) is decoded opacity.

The default method, **P-Sum**, uses linear falloff and sum aggregation. It is deterministic, renderer-agnostic, and suitable for CPU or GPU compute preprocessing.

## What Is Included

- A fork of PlayCanvas `splat-transform` with a `filterByPath` action.
- Python evaluation scripts for PSNR/SSIM/LPIPS comparisons against full-model renders.
- Baselines including random pruning, visibility pruning, path-aware variants, and a raster oracle.
- Free-roam trajectory split evaluation for robustness under viewpoint shift.
- Deployment estimates for SOG file size and runtime VRAM footprint.
- ACM/VRCAI paper source, generated figures, tables, and bibliography.

## Repository Layout

```text
.
├── splat-transform-fork/              # TypeScript/WebGPU pruning integration
├── experiments/
│   └── effect-size-prestudy/          # Python experiments and evaluation outputs
├── paper/                             # Lightweight paper notes in the root workspace
├── runtime-playcanvas/                # PlayCanvas-side integration workspace
├── shared-schemas/                    # JSON schema placeholders for poses/manifests
├── scripts/                           # Cross-project automation notes
├── character-controller.js            # PlayCanvas movement/controller prototype
├── streamed-gsplat.mjs                # Browser-side streamed splat prototype
└── ui.mjs                             # Browser UI prototype
```

The full LaTeX paper workspace used during writing is maintained separately at `~/projects/paper` on the development machine. This repository tracks the implementation and experiment artifacts used by the paper.

## Quick Start

### 1. Install Python dependencies

The experiment track uses `uv`.

```bash
cd experiments/effect-size-prestudy
uv sync
```

### 2. Run the main evaluation script

```bash
uv run python scripts/run_effect_size.py \
  --scenes kitchen room counter truck train \
  --keep_ratios 0.5 \
  --no-lambda-sweep
```

The script writes CSV summaries under:

```text
experiments/effect-size-prestudy/output/
```

Important outputs include:

- `effect_size_all.csv`: main in-distribution results;
- `effect_size_all_freeroam.csv`: free-roam split results;
- `timing.csv`: preprocessing runtime measurements;
- `visual/`: qualitative render comparisons.

### 3. Use path-aware pruning from TypeScript

The implementation lives in:

```text
splat-transform-fork/src/lib/data-table/decimate.ts
```

The process action entry point is wired through:

```text
splat-transform-fork/src/lib/process.ts
```

Typical inputs:

- a trained 3DGS asset (`.ply` or internal splat table);
- `poses.json` with camera positions, rotations, and FOV;
- pruning parameters such as `keepRatio`, `safeguardRatio`, and frustum settings.

Typical outputs:

- a filtered Gaussian set;
- SOG-compatible packaged assets;
- a manifest describing pruning and LOD parameters.

## Key Results

At keep ratio `0.5` on five benchmark scenes, the paper reports:

- P-Sum improves mean PSNR by about `+7.23 dB` over visibility pruning.
- Free-roam evaluation keeps positive gains on all tested scenes.
- Pruning roughly halves estimated SOG transfer size and runtime VRAM footprint.
- P-Sum is robust across heterogeneous scenes, while hybrid/max-based variants can help narrow linear trajectories.

These numbers are generated from the CSV outputs in `experiments/effect-size-prestudy/output/`.

## Development Notes

### Python tests

```bash
cd experiments/effect-size-prestudy
uv run pytest
```

### TypeScript tests/build

```bash
cd splat-transform-fork
npm install
npm test
npm run build
```

The five benchmark scenes (`kitchen`, `room`, `counter`, `truck`, `train`) live under `experiments/effect-size-prestudy/data/` and are tracked with **Git LFS** (~2.3 GB). After cloning, run `git lfs install && git lfs pull`. To rebuild locally from upstream 3DGS checkpoints, see `experiments/effect-size-prestudy/scripts/setup_benchmark_data.sh`. Render caches under `experiments/**/output/cache/` remain gitignored.

## Paper

The current paper title is:

> Path-Aware Pruning for Web-Based 3DGS Deployment

The latest local draft PDF is exported on the development machine as:

```text
/mnt/c/Users/lixiuyuan/Desktop/vrcai_paper_v4.pdf
```

## Author

Xiuyuan Li  
Shanghai Jiao Tong University  
Ferrari458@sjtu.edu.cn

## License

This repository includes original research code and local integration work. Third-party components, including PlayCanvas-related code and benchmark datasets, retain their respective upstream licenses and terms.
