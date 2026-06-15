#!/usr/bin/env bash
# Bake web-ready terrain assets from the raw LiDAR DTM.
# Runs the Python pipeline inside the GDAL Docker image so nothing is installed
# on the host. Idempotent — re-running overwrites outputs.
#
# Usage:  bash scripts/bake_terrain.sh
# Prereq: Docker, F06.zip unzipped to .scratch/F06.asc

set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="ghcr.io/osgeo/gdal:ubuntu-small-latest"

echo "▸ Running bake_terrain.py inside ${IMAGE}…"
docker run --rm \
  -v "$(pwd):/work" \
  -w /work \
  "$IMAGE" \
  python3 scripts/bake_terrain.py \
    --input .scratch/F06.asc \
    --outdir assets \
    --scratch .scratch \
    --target 2048 \
    --epsg 3844

echo "▸ Done. Assets written to assets/"
ls -lh assets/retezat-*
