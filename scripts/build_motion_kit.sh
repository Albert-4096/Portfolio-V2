#!/usr/bin/env bash
# Build vendor/motion-kit.min.js: a tree-shaken ESM bundle of anime.js + Motion.
# Installs pinned versions into a throwaway dir, so the repo stays build-free.
#
# Usage:  bash scripts/build_motion_kit.sh
# Prereq: Node 18+

set -euo pipefail
cd "$(dirname "$0")/.."

ANIME=4.5.0
MOTION=14.5.0
ESBUILD=0.28.2
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "▸ Installing animejs@${ANIME} motion@${MOTION} esbuild@${ESBUILD}…"
cp scripts/motion-kit.entry.js "$TMP/entry.js"
(cd "$TMP" && npm init -y >/dev/null && npm i --silent --no-audit --no-fund \
  "animejs@${ANIME}" "motion@${MOTION}" "esbuild@${ESBUILD}")

echo "▸ Bundling…"
"$TMP/node_modules/.bin/esbuild" "$TMP/entry.js" --bundle --minify --format=esm \
  --legal-comments=none --banner:js="/* anime.js ${ANIME} (MIT, Julian Garnier) + Motion ${MOTION} (MIT, Motion Division) — built by scripts/build_motion_kit.sh */" \
  --outfile=vendor/motion-kit.min.js

echo "✓ vendor/motion-kit.min.js  $(wc -c < vendor/motion-kit.min.js) B, $(gzip -9c vendor/motion-kit.min.js | wc -c) B gzip"
