#!/usr/bin/env bash
# Download and lay out the five benchmark scenes under data/.
# Requires: wget or curl, unzip, ~20 GB free disk during setup.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets"
DL="$ROOT/data/_downloads"
mkdir -p "$DL" "$ROOT/data/mipnerf360" "$ROOT/data/tandt"

download() {
  local url="$1" out="$2"
  if [[ -f "$out" ]]; then
    echo "[skip] $out exists"
    return 0
  fi
  echo "[get] $url"
  if command -v wget >/dev/null; then
    wget -c -O "$out" "$url"
  else
    curl -L -C - -o "$out" "$url"
  fi
}

# --- 1) Pre-trained 3DGS checkpoints (point_cloud.ply) ---
MODELS_ZIP="$DL/models.zip"
download "$BASE_URL/pretrained/models.zip" "$MODELS_ZIP"

TMP_MODELS="$DL/models_extract"
rm -rf "$TMP_MODELS"
mkdir -p "$TMP_MODELS"
unzip -q "$MODELS_ZIP" -d "$TMP_MODELS"

link_ply() {
  local scene="$1" dest_sub="$2"
  local dest="$ROOT/data/$dest_sub/$scene"
  mkdir -p "$dest"
  local ply
  ply="$(find "$TMP_MODELS" -path "*/$scene/point_cloud/iteration_*/point_cloud.ply" 2>/dev/null | head -1)"
  if [[ -z "$ply" ]]; then
    ply="$(find "$TMP_MODELS" -path "*/$scene*/point_cloud.ply" 2>/dev/null | head -1)"
  fi
  if [[ -z "$ply" ]]; then
    echo "[warn] no point_cloud.ply for $scene in models.zip"
    return 1
  fi
  cp -f "$ply" "$dest/point_cloud.ply"
  echo "[ok] $dest/point_cloud.ply"
}

for s in kitchen room counter; do link_ply "$s" "mipnerf360" || true; done
for s in truck train; do link_ply "$s" "tandt" || true; done

# --- 2) COLMAP sparse (Tanks & Temples) ---
TANDT_ZIP="$DL/tandt_db.zip"
download "$BASE_URL/input/tandt_db.zip" "$TANDT_ZIP"
TMP_TT="$DL/tandt_extract"
rm -rf "$TMP_TT"
mkdir -p "$TMP_TT"
unzip -q "$TANDT_ZIP" -d "$TMP_TT"

copy_colmap() {
  local scene="$1"
  local dest="$ROOT/data/tandt/$scene"
  mkdir -p "$dest"
  local sparse
  sparse="$(find "$TMP_TT" -type d -path "*/$scene/sparse/0" 2>/dev/null | head -1)"
  if [[ -z "$sparse" ]]; then
    sparse="$(find "$TMP_TT" -type d -path "*/$scene*/sparse/0" 2>/dev/null | head -1)"
  fi
  if [[ -z "$sparse" ]]; then
    echo "[warn] no sparse/0 for $scene in tandt_db.zip"
    return 1
  fi
  cp -f "$sparse/cameras.bin" "$sparse/images.bin" "$sparse/points3D.bin" "$dest/"
  echo "[ok] COLMAP bins -> $dest"
}

for s in truck train; do copy_colmap "$s" || true; done

# --- 3) MiP-NeRF 360 COLMAP ---
# Official SfM lives on https://jonbarron.info/mipnerf360/ (per-scene downloads).
# Place sparse/0/{cameras,images,points3D}.bin into data/mipnerf360/<scene>/ then re-run:
#   uv run python scripts/convert_colmap_to_poses.py
echo ""
echo "MiP-NeRF 360 COLMAP: download SfM from https://jonbarron.info/mipnerf360/"
echo "  Copy sparse/0/*.bin into data/mipnerf360/{kitchen,room,counter}/"
echo "  Then: uv run python scripts/convert_colmap_to_poses.py"
echo "        uv run python scripts/sparsify_kitchen.py"
echo "        uv run python scripts/spatial_split.py data/mipnerf360/kitchen trajectory_half"
echo "        (repeat spatial_split for room, counter, truck, train)"

if [[ -f "$ROOT/data/mipnerf360/kitchen/cameras.bin" ]]; then
  uv run python scripts/convert_colmap_to_poses.py
  uv run python scripts/sparsify_kitchen.py 2>/dev/null || true
  for scene_dir in "$ROOT"/data/mipnerf360/* "$ROOT"/data/tandt/*; do
    [[ -f "$scene_dir/poses_train.json" ]] && continue
    [[ -f "$scene_dir/cameras.bin" ]] || continue
    uv run python scripts/spatial_split.py "$scene_dir" trajectory_half || true
  done
fi

echo "Done. Verify: ls -la data/mipnerf360/kitchen data/tandt/truck"
