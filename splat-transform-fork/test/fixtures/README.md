# Crossref Fixture Generation

The cross-reference fixture files are generated deterministically from Python with seed `42`:

- `crossref-1k.ply`
- `crossref-10poses.json`

Generation command (from `../experiments/effect-size-prestudy`):

```bash
source "$HOME/.local/bin/env"
PYTHONPATH=. uv run python scripts/generate_crossref_fixture.py --out-dir /tmp/crossref-fixture --seed 42
```

Then copy into this folder:

```bash
cp /tmp/crossref-fixture/crossref-1k.ply test/fixtures/crossref-1k.ply
cp /tmp/crossref-fixture/crossref-10poses.json test/fixtures/crossref-10poses.json
```

Both files are intentionally kept below 100 KB.
