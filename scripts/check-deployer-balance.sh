#!/usr/bin/env bash
set -euo pipefail

# check-deployer-balance.sh
# Fetches the deployer Stellar account balance from Horizon and outputs
# Prometheus metrics (useful with node_exporter textfile collector or CI).
#
# Usage:
#   DEPLOYER_PUBLIC_KEY="G..." ./scripts/check-deployer-balance.sh
#   DEPLOYER_PUBLIC_KEY="G..." STELLAR_NETWORK=mainnet ./scripts/check-deployer-balance.sh
#
# Required env vars:
#   DEPLOYER_PUBLIC_KEY  — Stellar public key of the deployer account
#
# Optional env vars:
#   HORIZON_URL   — Horizon API URL (default: https://horizon-testnet.stellar.org)
#   STELLAR_NETWORK  — Network label for metrics (default: testnet)

HORIZON_URL="${HORIZON_URL:-https://horizon-testnet.stellar.org}"
STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
DEPLOYER_PUBLIC_KEY="${DEPLOYER_PUBLIC_KEY:?DEPLOYER_PUBLIC_KEY is required}"

WARNING_THRESHOLD="${WARNING_THRESHOLD:-500}"
CRITICAL_THRESHOLD="${CRITICAL_THRESHOLD:-100}"

response=$(curl -sf "${HORIZON_URL}/accounts/${DEPLOYER_PUBLIC_KEY}" 2>/dev/null) || {
  echo "# HELP deployer_account_up Whether the deployer account was reachable via Horizon"
  echo "# TYPE deployer_account_up gauge"
  echo "deployer_account_up{network=\"${STELLAR_NETWORK}\"} 0"
  exit 0
}

balance=$(echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for b in data.get('balances', []):
    if b.get('asset_type') == 'native':
        print(b.get('balance', '0'))
        break
" 2>/dev/null || echo "0")

echo "# HELP deployer_account_balance Current XLM balance of the deployer account"
echo "# TYPE deployer_account_balance gauge"
echo "deployer_account_balance{network=\"${STELLAR_NETWORK}\"} ${balance}"

echo "# HELP deployer_account_up Whether the deployer account was reachable via Horizon"
echo "# TYPE deployer_account_up gauge"
echo "deployer_account_up{network=\"${STELLAR_NETWORK}\"} 1"

echo "# HELP deployer_account_balance_threshold_warning Warning threshold exceeded (balance < ${WARNING_THRESHOLD} XLM)"
echo "# TYPE deployer_account_balance_threshold_warning gauge"
if awk "BEGIN {exit !(${balance} < ${WARNING_THRESHOLD})}"; then
  echo "deployer_account_balance_threshold_warning{network=\"${STELLAR_NETWORK}\",threshold=\"${WARNING_THRESHOLD}\"} 1"
else
  echo "deployer_account_balance_threshold_warning{network=\"${STELLAR_NETWORK}\",threshold=\"${WARNING_THRESHOLD}\"} 0"
fi

echo "# HELP deployer_account_balance_threshold_critical Critical threshold exceeded (balance < ${CRITICAL_THRESHOLD} XLM)"
echo "# TYPE deployer_account_balance_threshold_critical gauge"
if awk "BEGIN {exit !(${balance} < ${CRITICAL_THRESHOLD})}"; then
  echo "deployer_account_balance_threshold_critical{network=\"${STELLAR_NETWORK}\",threshold=\"${CRITICAL_THRESHOLD}\"} 1"
else
  echo "deployer_account_balance_threshold_critical{network=\"${STELLAR_NETWORK}\",threshold=\"${CRITICAL_THRESHOLD}\"} 0"
fi
