#!/usr/bin/env bash
# Infrastructure health check: pings the web app, Horizon RPC, and monitoring endpoints.
# Prints a PASS/FAIL summary. Exits 1 if any check fails.
# Usage: bash infra/scripts/healthcheck.sh
set -euo pipefail

WEB_URL="${APP_URL:-http://localhost:3000}"
HORIZON_URL="${HORIZON_URL:-https://horizon-testnet.stellar.org}"
MONITORING_URL="${MONITORING_URL:-}"

PASS=0
FAIL=0

check_http() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"
  if [ -z "$url" ]; then
    echo "[SKIP] $label (URL not configured)"
    return
  fi
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [ "$status" = "$expected_status" ]; then
    echo "[PASS] $label ($url) — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $label ($url) — HTTP $status (expected $expected_status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Running infrastructure health checks..."
echo ""

check_http "Web app" "$WEB_URL"
check_http "Horizon RPC" "$HORIZON_URL"
[ -n "$MONITORING_URL" ] && check_http "Monitoring" "$MONITORING_URL"

echo ""
echo "Summary: $PASS passed, $FAIL failed."

[ $FAIL -eq 0 ] || exit 1
