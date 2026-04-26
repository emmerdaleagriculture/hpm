#!/usr/bin/env bash
#
# check-redirects.sh — verify legacy WP URLs redirect to the right place
# in a single hop, no chains.
#
# Run after DNS has flipped to the new site. Each URL should print
# exactly one HTTP/2 301 (or 308) line + a Location: header pointing
# at the final destination, then HTTP/2 200 from that destination.
#
# Multiple redirect lines = a chain → fix in next.config.mjs.
#
# Usage:
#   bash scripts/check-redirects.sh
#   bash scripts/check-redirects.sh https://staging.example.com   # custom origin

set -euo pipefail

ORIGIN="${1:-https://hampshirepaddockmanagement.com}"

# Pulled from the handover doc + next.config.mjs. Keep in sync as the
# redirect map evolves.
PATHS=(
  "/costs"
  "/costs/"
  "/services/fertiliser-spraying"
  "/services/dung-sweeping"
  "/services/field-harrowing"
  "/services/paddock-rolling"
  "/services/ragwort-pulling"
  "/blog"
  "/blog/some-post"
  "/shop"
  "/cart"
  "/my-account"
  "/tools"
  "/privacy-policy"
)

UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

for p in "${PATHS[@]}"; do
  echo "=== ${p} ==="
  curl -sIL -A "$UA" --max-time 10 "${ORIGIN}${p}" \
    | grep -iE "^(HTTP|location:)" \
    || echo "  (no response)"
  echo
done
