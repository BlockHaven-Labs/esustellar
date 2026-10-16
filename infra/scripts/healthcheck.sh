#!/usr/bin/env bash
# Infrastructure health check: pings the web app, Horizon RPC, and monitoring endpoints.
#
# Exit codes (stable — safe to branch on from CI or a Kubernetes probe):
#   0  all configured checks passed
#   1  at least one check failed (this is the "not ready" signal)
#   2  usage or configuration error (bad flag, missing required dependency)
#
# Usage:
#   bash infra/scripts/healthcheck.sh [options]
#
# Options:
#   --json           emit one JSON object per line instead of the human summary
#   --quiet          suppress the per-check PASS/FAIL lines (summary only)
#   --require NAME   fail with exit 2 unless check NAME ran (use to make sure a
#                    check was actually exercised rather than skipped)
#   --timeout SECS   per-request curl timeout (default 10)
#   -h, --help       show this help
#
# Environment:
#   APP_URL        web app base URL          (default http://localhost:3000)
#   HORIZON_URL    Stellar Horizon URL        (default https://horizon-testnet.stellar.org)
#   MONITORING_URL monitoring endpoint        (default empty -> skipped)
#   EXPECTED_STATUS expected HTTP status      (default 200)
#
# Kubernetes readiness probe example:
#   readinessProbe:
#     exec:
#       command: ["bash", "-c", "APP_URL=https://esustellar.io MONITORING_URL= bash infra/scripts/healthcheck.sh --quiet"]
#     periodSeconds: 10
#     failureThreshold: 3
#
# Note (#1118): a check whose URL is unset is reported as SKIPPED and does NOT
# fail the run, but it is reported in the --json output and can be made fatal
# with --require. That is deliberate: MONITORING_URL is legitimately unset in
# environments with no monitoring stack, and silently treating a skipped check
# as a pass is how a broken gate looks green.
set -euo pipefail

EMIT_JSON=0
QUIET=0
TIMEOUT_SECS=10
REQUIRED_CHECKS=()

WEB_URL="${APP_URL:-http://localhost:3000}"
HORIZON_URL="${HORIZON_URL:-https://horizon-testnet.stellar.org}"
MONITORING_URL="${MONITORING_URL:-}"
EXPECTED_STATUS="${EXPECTED_STATUS:-200}"

while [ $# -gt 0 ]; do
  case "$1" in
    --json) EMIT_JSON=1; shift ;;
    --quiet) QUIET=1; shift ;;
    --timeout) TIMEOUT_SECS="${2:?--timeout requires a value}"; shift 2 ;;
    --require) REQUIRED_CHECKS+=("${2:?--require requires a value}"); shift 2 ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;$d'; exit 0 ;;
    *) echo "healthcheck.sh: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

command -v curl >/dev/null 2>&1 || { echo "healthcheck.sh: curl not found" >&2; exit 2; }

PASS=0
FAIL=0
SKIP=0
CHECKED=()

# Records the outcome of one check. $2 is one of PASS / FAIL / SKIP. Emitting the
# result here (rather than only the counters) is what makes --json and --require
# possible without duplicating the check body.
record() {
  local label="$1" result="$2" detail="$3"
  CHECKED+=("$label")

  case "$result" in
    PASS) PASS=$((PASS + 1)) ;;
    FAIL) FAIL=$((FAIL + 1)) ;;
    SKIP) SKIP=$((SKIP + 1)) ;;
  esac

  if [ "$EMIT_JSON" -eq 1 ]; then
    # detail is a plain message with no quotes/backslashes, so this is safe
    # without pulling in a JSON encoder.
    printf '{"check":"%s","result":"%s","detail":"%s"}\n' "$label" "$result" "$detail"
  elif [ "$QUIET" -eq 0 ]; then
    printf '[%s] %s — %s\n' "$result" "$label" "$detail"
  fi
}

check_http() {
  local label="$1"
  local url="$2"
  local expected="${3:-$EXPECTED_STATUS}"

  if [ -z "$url" ]; then
    record "$label" SKIP "URL not configured"
    return
  fi

  local status
  # #1118: `curl -w "%{http_code}"` already prints 000 when it cannot reach the
  # host, and it also exits non-zero for that case. Using `curl ... || echo "000"`
  # therefore appended a second 000 and produced "000000", which printed a
  # nonsensical status in the failure line. Assign on failure instead.
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT_SECS" "$url") || status="000"
  if [ "$status" = "$expected" ]; then
    record "$label" PASS "$url — HTTP $status"
  else
    record "$label" FAIL "$url — HTTP $status (expected $expected)"
  fi
}

[ "$EMIT_JSON" -eq 1 ] || echo "Running infrastructure health checks..."
[ "$EMIT_JSON" -eq 1 ] || echo ""

check_http "Web app" "$WEB_URL"
check_http "Horizon RPC" "$HORIZON_URL"
check_http "Monitoring" "$MONITORING_URL"

# A --require for a check that never ran is a configuration error, not a health
# failure: exit 2 keeps it distinguishable from "the deployment is down".
for required in "${REQUIRED_CHECKS[@]:-}"; do
  [ -n "$required" ] || continue
  found=0
  for label in "${CHECKED[@]:-}"; do
    if [ "$label" = "$required" ]; then found=1; break; fi
  done
  if [ "$found" -eq 0 ]; then
    echo "healthcheck.sh: required check '$required' was not run" >&2
    exit 2
  fi
done

if [ "$EMIT_JSON" -eq 1 ]; then
  printf '{"summary":true,"passed":%d,"failed":%d,"skipped":%d}\n' "$PASS" "$FAIL" "$SKIP"
else
  echo ""
  echo "Summary: $PASS passed, $FAIL failed, $SKIP skipped."
fi

# #1118: a real failure must always be a non-zero exit so a CI gate or probe
# that only looks at the status code cannot be fooled by the human-readable
# text above. Keep 1 for "unhealthy" and 2 for "misconfigured".
[ "$FAIL" -eq 0 ] || exit 1
exit 0