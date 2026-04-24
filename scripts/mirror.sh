#!/usr/bin/env bash
# Full static mirror of the WordPress site as a safety net.
# Run after the API extraction so we have a second, independent archive.
#
# Requires: wget (brew install wget / apt install wget)

set -euo pipefail

SITE="https://hampshirepaddockmanagement.com"
OUT="./extracted/mirror"

mkdir -p "$OUT"

echo "Mirroring $SITE to $OUT ..."
wget \
  --mirror \
  --convert-links \
  --adjust-extension \
  --page-requisites \
  --no-parent \
  --wait=0.5 \
  --random-wait \
  --user-agent="hpm-migration-mirror/1.0" \
  --directory-prefix="$OUT" \
  "$SITE"

echo ""
echo "Mirror complete. Size:"
du -sh "$OUT"
