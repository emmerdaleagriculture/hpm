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

# Mirrors the redirects() block in next.config.mjs. Param patterns
# (/blog/:slug, /shop/:path*, /my-account/:path*) are tested with a
# representative concrete value. Keep this list in sync as the
# redirect map evolves.
PATHS=(
  # /costs → /pricing
  "/costs"
  "/costs/"

  # Renamed services
  "/services/dung-sweeping"
  "/services/fertiliser-spraying"
  "/services/field-harrowing"
  "/services/field-ploughing"
  "/services/field-rotavating"
  "/services/paddock-rolling"
  "/services/ragwort-pulling"

  # Old root-level WP service URLs
  "/field-ploughing"
  "/field-ploughing/"
  "/hedge-cutting"
  "/hedge-cutting/"
  "/seedsight"
  "/seedsight/"

  # Blog → Notes
  "/blog"
  "/blog/example-post-slug"

  # WooCommerce artefacts
  "/shop"
  "/shop/some-product"
  "/cart"
  "/checkout"
  "/my-account"
  "/my-account/orders"
  "/wishlist"
  "/products-compare"

  # Other old WP paths
  "/tools"
  "/videos"
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
