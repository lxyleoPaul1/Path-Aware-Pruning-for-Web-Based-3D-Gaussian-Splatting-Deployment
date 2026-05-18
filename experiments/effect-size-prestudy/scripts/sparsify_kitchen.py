from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    src = Path("data/mipnerf360/kitchen/poses_train.json")
    dst = Path("data/mipnerf360/kitchen/poses_train_sparse.json")
    payload = json.loads(src.read_text(encoding="utf-8"))
    poses = payload["poses"]
    sparse = poses[::5]
    payload["poses"] = sparse
    dst.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"source_n={len(poses)} sparse_n={len(sparse)}")
    print(dst.as_posix())


if __name__ == "__main__":
    main()
