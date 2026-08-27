#!/usr/bin/env bash
set -euo pipefail

# Automated multi-network deployment script (#866)
#
# Deploys EsuStellar contracts with configurable network selection,
# proper error handling, and network-namespaced deployment info.
#
# Usage:
#   ./scripts/deploy-contracts.sh [--network testnet|futurenet|mainnet]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_FILE="$ROOT_DIR/deployment-info.json"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

# ── Colors ────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ ${NC}$*"; }
log_ok()    { echo -e "${GREEN}✅ ${NC}$*"; }
log_warn()  { echo -e "${YELLOW}⚠️  ${NC}$*"; }
log_error() { echo -e "${RED}❌ ${NC}$*" >&2; }

# ── Parse args ────────────────────────────────────────────────────────

NETWORK="testnet"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Validate network
case "$NETWORK" in
  testnet|futurenet|mainnet) ;;
  *) log_error "Invalid network: $NETWORK. Must be testnet, futurenet, or mainnet."; exit 1 ;;
esac

# ── Network configuration ─────────────────────────────────────────────

case "$NETWORK" in
  testnet)
    NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
    RPC_URL="https://soroban-testnet.stellar.org"
    ;;
  futurenet)
    NETWORK_PASSPHRASE="Test SDF Future Network ; October 2022"
    RPC_URL="https://soroban-futurenet.stellar.org"
    ;;
  mainnet)
    NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
    RPC_URL="https://soroban-mainnet.stellar.org"
    ;;
esac

# Safety: confirm mainnet deploys
if [ "$NETWORK" = "mainnet" ]; then
  echo -e "${RED}WARNING: Deploying to MAINNET. This is irreversible.${NC}"
  read -rp "Type 'mainnet' to confirm: " confirm
  if [ "$confirm" != "mainnet" ]; then
    echo "Aborted."
    exit 1
  fi
fi

# ── Validate CLI ─────────────────────────────────────────────────────

command -v stellar >/dev/null 2>&1 || { log_error "Stellar CLI not found"; exit 1; }

# ── Build contracts ───────────────────────────────────────────────────

log_info "Building contracts..."
cd "$ROOT_DIR/contracts/savings"
stellar contract build 2>&1 || { log_error "Failed to build savings contract"; exit 1; }
log_ok "Savings contract built"

cd "$ROOT_DIR/contracts/registry"
stellar contract build 2>&1 || { log_error "Failed to build registry contract"; exit 1; }
log_ok "Registry contract built"

cd "$ROOT_DIR"

# ── Prepare deployer ─────────────────────────────────────────────────

log_info "Preparing deployer identity..."
if ! stellar keys ls 2>/dev/null | awk '{print $1}' | grep -xq "deployer-${NETWORK}"; then
  stellar keys generate "deployer-${NETWORK}" --network "$NETWORK" 2>&1
fi

if [ "$NETWORK" = "testnet" ]; then
  log_info "Funding deployer account..."
  stellar keys fund "deployer-${NETWORK}" --network "$NETWORK" 2>&1 || true
fi

# ── Check deployer balance ───────────────────────────────────────────

log_info "Checking deployer balance..."
BALANCE=$(stellar keys balance "deployer-${NETWORK}" --network "$NETWORK" 2>/dev/null || echo "0")
log_info "Deployer balance: $BALANCE XLM"

# ── Deploy registry ──────────────────────────────────────────────────

log_info "Deploying Registry Contract..."
REGISTRY_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$ROOT_DIR/target/wasm32v1-none/release/group_registry.wasm" \
  --source-account "deployer-${NETWORK}" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" 2>&1) || {
  log_error "Registry deployment FAILED. No partial deploys committed."
  exit 1
}
log_ok "Registry deployed: ${REGISTRY_CONTRACT_ID}"

# Verify registry
log_info "Verifying registry contract..."
stellar contract invoke \
  --id "$REGISTRY_CONTRACT_ID" \
  --source-account "deployer-${NETWORK}" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- get_group_count > /dev/null 2>&1 || {
  log_error "Registry verification FAILED"
  exit 1
}
log_ok "Registry verified"

# ── Deploy savings ───────────────────────────────────────────────────

log_info "Deploying Savings Contract..."
SAVINGS_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$ROOT_DIR/target/wasm32v1-none/release/esustellar_savings.wasm" \
  --source-account "deployer-${NETWORK}" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" 2>&1) || {
  log_error "Savings deployment FAILED. Registry deployed at ${REGISTRY_CONTRACT_ID} but savings failed."
  exit 1
}
log_ok "Savings deployed: ${SAVINGS_CONTRACT_ID}"

# Verify savings
log_info "Verifying savings contract..."
stellar contract invoke \
  --id "$SAVINGS_CONTRACT_ID" \
  --source-account "deployer-${NETWORK}" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- get_all_groups > /dev/null 2>&1 || {
  log_error "Savings verification FAILED"
  exit 1
}
log_ok "Savings verified"

# ── Write deployment info (network-namespaced) ───────────────────────

log_info "Writing deployment info..."

# Read existing or initialize
existing="{}"
if [ -f "$DEPLOYMENT_FILE" ]; then
  existing=$(cat "$DEPLOYMENT_FILE")
fi

# Simple JSON update (avoid jq dependency)
cat > "$DEPLOYMENT_FILE" <<EOF
{
  "registry_contract_id": "$REGISTRY_CONTRACT_ID",
  "savings_contract_id": "$SAVINGS_CONTRACT_ID",
  "network": "$NETWORK",
  "network_passphrase": "$NETWORK_PASSPHRASE",
  "rpc_url": "$RPC_URL",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "deployer-${NETWORK}"
}
EOF

log_ok "Deployment info written to $DEPLOYMENT_FILE"

# ── Write frontend env ──────────────────────────────────────────────

mkdir -p "$(dirname "$ENV_FILE")"
{
  if [ -f "$ENV_FILE" ]; then
    grep -v '^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=' "$ENV_FILE" 2>/dev/null | \
    grep -v '^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=' | \
    grep -v '^NEXT_PUBLIC_CONTRACT_ID=' || true
  fi
  echo "NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$REGISTRY_CONTRACT_ID"
  echo "NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$SAVINGS_CONTRACT_ID"
  echo "NEXT_PUBLIC_CONTRACT_ID=$SAVINGS_CONTRACT_ID"
} > "$ENV_FILE.tmp"
mv "$ENV_FILE.tmp" "$ENV_FILE"
log_ok "Frontend env updated"

# ── Summary ───────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}🎉 Deployment complete on ${NETWORK}!${NC}"
echo ""
echo "📋 Contract IDs:"
echo -e "  Registry: ${BLUE}${REGISTRY_CONTRACT_ID}${NC}"
echo -e "  Savings:  ${BLUE}${SAVINGS_CONTRACT_ID}${NC}"
echo ""
echo "🔗 Explorers:"
echo "  Registry: https://stellar.expert/explorer/$NETWORK/contract/$REGISTRY_CONTRACT_ID"
echo "  Savings:  https://stellar.expert/explorer/$NETWORK/contract/$SAVINGS_CONTRACT_ID"
