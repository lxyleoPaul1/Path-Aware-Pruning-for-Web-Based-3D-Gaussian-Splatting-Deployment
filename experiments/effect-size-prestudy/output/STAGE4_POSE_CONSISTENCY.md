# STAGE4 Pose Consistency Diagnosis

Goal: check whether `render` camera convention and `pruning` frustum convention are misaligned (forward axis / Euler order / basis choice).

Method:

1. Render one pose with gsplat (`packed=True`) and collect `meta["gaussian_ids"]` as raster-hit set.
2. Compute frustum-visible set under multiple conventions:
   - Euler order: `xyz, xzy, yxz, yzx, zxy, zyx`
   - Basis: columns vs rows
   - Forward sign: `+Z` vs `-Z`
3. Compare set overlap by `precision / recall / F1`.

Script:

```bash
PYTHONPATH=. uv run python scripts/diagnose_pose_consistency.py --scene <scene> --pose-index 0 --topk 8
```

## Key Findings

### kitchen (pose 0)
- Current convention (`xyz`, cols, `+forward`) is near top and close to best.
- Single-pose top F1 differs from current by a small margin, but multi-pose aggregate test selects current convention as best.

### train (pose 0)
- Best single-pose convention is slightly different (`xzy`, rows, `+forward`), but gain over current is small.
- Multi-pose aggregate also shows only minor gap (no order-of-magnitude mismatch).

### truck (pose 0)
- All conventions show much lower recall than kitchen/train.
- Current vs best gap is small; no evidence of a catastrophic forward-axis flip.

## Conclusion

No strong evidence that the 5-10 dB drop is primarily caused by a gross pose-convention mismatch (e.g., wrong forward sign or totally wrong Euler order).
Pose convention differences exist but are second-order compared with the observed performance collapse.
