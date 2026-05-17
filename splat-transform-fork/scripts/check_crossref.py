from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_indices(path: Path) -> set[int]:
    items: set[int] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        items.add(int(line))
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description="Check TS/PY retained-index overlap.")
    parser.add_argument("--ts", type=Path, default=Path("test/fixtures/crossref-ts-output.txt"))
    parser.add_argument("--py", type=Path, default=Path("test/fixtures/crossref-py-output.txt"))
    parser.add_argument("--ts-scores", type=Path, default=Path("test/fixtures/crossref-ts-scores.json"))
    parser.add_argument("--py-scores", type=Path, default=Path("test/fixtures/crossref-py-scores.json"))
    args = parser.parse_args()

    ts_idx = read_indices(args.ts)
    py_idx = read_indices(args.py)
    inter = ts_idx & py_idx
    ts_ratio = len(inter) / max(1, len(ts_idx))
    py_ratio = len(inter) / max(1, len(py_idx))

    print(f"|TS∩PY|/|TS| = {ts_ratio:.6f}")
    print(f"|PY∩TS|/|PY| = {py_ratio:.6f}")

    if ts_ratio < 0.99 or py_ratio < 0.99:
        ts_scores = json.loads(args.ts_scores.read_text(encoding="utf-8"))
        py_scores = json.loads(args.py_scores.read_text(encoding="utf-8"))
        disagree = sorted(ts_idx ^ py_idx)
        print(f"disagree_count={len(disagree)}")
        print("first_20_disagreeing_indices_with_scores:")
        for idx in disagree[:20]:
            ts_s = ts_scores[idx] if idx < len(ts_scores) else None
            py_s = py_scores[idx] if idx < len(py_scores) else None
            print(f"  idx={idx} ts_score={ts_s} py_score={py_s}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
