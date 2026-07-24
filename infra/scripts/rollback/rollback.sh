#!/usr/bin/env bash
# Rolls back the esustellar contracts to the previous WASM build and restores
# the frontend environment variables from a deployment snapshot.
# Usage: bash infra/scripts/rollback/rollback.sh [testnet|staging]
set -euo pipefail

NETWORK="${1:-testnet}"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
SNAPSHOT_FILE="$ROOT_DIR/deployment-info.json"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

if [ ! -f "$SNAPSHOT_FILE" ]; then
  echo "ERROR: deployment-info.json not found. Cannot determine previous state."
  exit 1
fi

PREV_REGISTRY_ID=$(jq -r '.registry_contract_id' "$SNAPSHOT_FILE")
PREV_SAVINGS_ID=$(jq -r '.savings_contract_id' "$SNAPSHOT_FILE")

if [ -z "$PREV_REGISTRY_ID" ] || [ -z "$PREV_SAVINGS_ID" ]; then
  echo "ERROR: Could not read contract IDs from deployment-info.json."
  exit 1
fi

echo "Rolling back to:"
echo "  Registry: $PREV_REGISTRY_ID"
echo "  Savings:  $PREV_SAVINGS_ID"
echo "  Network:  $NETWORK"
echo ""

# Restore frontend env vars
if [ -f "$ENV_FILE" ]; then
  sed -i.bak     -e "s|^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=.*|NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$PREV_REGISTRY_ID|"     -e "s|^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=.*|NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$PREV_SAVINGS_ID|"     -e "s|^NEXT_PUBLIC_CONTRACT_ID=.*|NEXT_PUBLIC_CONTRACT_ID=$PREV_SAVINGS_ID|"     "$ENV_FILE"
  echo "Restored $ENV_FILE."
else
  echo "NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$PREV_REGISTRY_ID" > "$ENV_FILE"
  echo "NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$PREV_SAVINGS_ID" >> "$ENV_FILE"
  echo "NEXT_PUBLIC_CONTRACT_ID=$PREV_SAVINGS_ID" >> "$ENV_FILE"
  echo "Created $ENV_FILE."
fi

echo ""
echo "Rollback complete. Redeploy the frontend to apply the restored contract IDs."
