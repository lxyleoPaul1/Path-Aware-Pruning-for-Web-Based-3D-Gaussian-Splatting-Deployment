# SIGGRAPH VRCAI 2026 Workspace

This monorepo-style workspace organizes code, experiments, and paper assets for an ACM SIGGRAPH VRCAI 2026 research project. Each subdirectory has a focused role so development, evaluation, and writing can progress in parallel with clear boundaries.

## Layout

- `splat-transform-fork/`: Local placeholder for a separate `git clone` of your splat-transform fork.
- `runtime-playcanvas/`: Runtime integration workspace for PlayCanvas-side scene and interaction code.
- `experiments/`: Reproducible experiment tracks (prestudy, SOTA comparison, ablations, user study).
- `paper/`: LaTeX manuscript workspace based on ACM templates.
- `shared-schemas/`: JSON Schemas shared across scripts, experiments, and runtime data interfaces.
- `scripts/`: Cross-repo automation scripts in Bash and Python.
