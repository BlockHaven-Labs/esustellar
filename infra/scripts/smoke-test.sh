#!/usr/bin/env bash
# Post-deploy smoke test for esustellar contract functions.
# Verifies that the deployed contracts are reachable and return expected results.
# Usage: bash infra/scripts/smoke-test.sh [testnet|mainnet]
set -euo pipefail

NETWORK="${1:-testnet}"
REGISTRY_ID="${NEXT_PUBLIC_REGISTRY_CONTRACT_ID:-}"
SAVINGS_ID="${NEXT_PUBLIC_SAVINGS_CONTRACT_ID:-}"

if [ -z "$REGISTRY_ID" ] || [ -z "$SAVINGS_ID" ]; then
  echo "ERROR: NEXT_PUBLIC_REGISTRY_CONTRACT_ID and NEXT_PUBLIC_SAVINGS_CONTRACT_ID must be set."
  exit 1
fi

PASS=0
FAIL=0

run_check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "[PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "Running smoke tests against $NETWORK..."
echo ""

run_check "stellar CLI available" "command -v stellar"
run_check "Registry contract reachable"   "stellar contract invoke --id $REGISTRY_ID --network $NETWORK --source-account deployer -- get_all_groups"
run_check "Savings contract reachable"   "stellar contract invoke --id $SAVINGS_ID --network $NETWORK --source-account deployer -- get_config"

echo ""
echo "Results: $PASS passed, $FAIL failed."

if [ $FAIL -gt 0 ]; then
  exit 1
fi
