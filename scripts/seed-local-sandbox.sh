#!/usr/bin/env bash
set -euo pipefail

# Local sandbox seed script for demo/dev data (#871)
#
# Creates sample groups in varying states (open, active) on a local sandbox
# deployment so frontend developers have immediate data to build against.
#
# Usage:
#   ./scripts/seed-local-sandbox.sh
#
# Environment variables (optional, defaults from deployment-info.json):
#   SAVINGS_CONTRACT_ID  - Deployed savings contract address
#   NETWORK              - Stellar network (default: standalone)
#   NETWORK_PASSPHRASE   - Network passphrase (default: Standalone Network ; February 2017)
#   DEPLOYER             - Source account for transactions (default: deployer)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_FILE="$ROOT_DIR/deployment-info.json"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ ${NC}$*"; }
log_ok()    { echo -e "${GREEN}✅ ${NC}$*"; }
log_warn()  { echo -e "${YELLOW}⚠️  ${NC}$*"; }
log_error() { echo -e "${RED}❌ ${NC}$*" >&2; }

# ── Resolve contract IDs ──────────────────────────────────────────────

if [ -z "${SAVINGS_CONTRACT_ID:-}" ]; then
  if [ -f "$DEPLOYMENT_FILE" ]; then
    SAVINGS_CONTRACT_ID=$(grep -o '"savings_contract_id": *"[^"]*"' "$DEPLOYMENT_FILE" | head -1 | cut -d'"' -f4)
  fi
fi

if [ -z "${SAVINGS_CONTRACT_ID:-}" ] && [ -f "$ENV_FILE" ]; then
  SAVINGS_CONTRACT_ID=$(grep '^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || true)
fi

if [ -z "${SAVINGS_CONTRACT_ID:-}" ]; then
  log_error "No SAVINGS_CONTRACT_ID found. Deploy contracts first or set the env var."
  exit 1
fi

NETWORK="${NETWORK:-standalone}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Standalone Network ; February 2017}"
DEPLOYER="${DEPLOYER:-deployer}"

log_info "Savings contract: ${SAVINGS_CONTRACT_ID}"
log_info "Network: ${NETWORK}"

# ── Helpers ───────────────────────────────────────────────────────────

invoke() {
  local contract_id="$1"; shift
  stellar contract invoke \
    --id "$contract_id" \
    --source-account "$DEPLOYER" \
    --network "$NETWORK" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- "$@"
}

invoke_read() {
  local contract_id="$1"; shift
  stellar contract invoke \
    --id "$contract_id" \
    --network "$NETWORK" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- "$@"
}

# ── Idempotency check ────────────────────────────────────────────────

log_info "Checking existing groups..."
existing_groups=$(invoke_read "$SAVINGS_CONTRACT_ID" get_all_groups 2>/dev/null || echo "()")

# Simple check: if we already have groups, warn but continue
if echo "$existing_groups" | grep -q "seed-open-group"; then
  log_warn "Seed groups already exist. Skipping creation to stay idempotent."
  log_ok "Seed complete (no changes)."
  exit 0
fi

# ── Calculate future timestamps ───────────────────────────────────────

now=$(date +%s)
start_time=$((now + 600))
start_time_2=$((now + 1200))

# ── Create Group 1: Open group (3 of 5 members, not yet full) ────────

log_info "Creating open group (3 of 5 members)..."
invoke "$SAVINGS_CONTRACT_ID" create_group \
  --admin "$DEPLOYER" \
  --group_id seed-open-group \
  --name "Open Demo Group" \
  --contribution_amount 100000000 \
  --total_members 5 \
  --frequency Weekly \
  --start_timestamp "$start_time" \
  --is_public true \
  --treasury "$DEPLOYER" \
  --token_address None

log_ok "Created 'Open Demo Group' (seed-open-group)"

# Join 2 extra members to reach 3 of 5
log_info "Adding members to open group..."
for i in 1 2; do
  member_key="seed-member-${i}"
  # Generate a funded account for the member
  stellar keys generate "$member_key" --network "$NETWORK" 2>/dev/null || true
  stellar keys fund "$member_key" --network "$NETWORK" 2>/dev/null || true
  member_addr=$(stellar keys address "$member_key" 2>/dev/null || echo "$DEPLOYER")

  invoke "$SAVINGS_CONTRACT_ID" join_group \
    --member "$member_addr" \
    --group_id seed-open-group 2>/dev/null || {
    log_warn "Could not add member ${i} (may need manual funding)"
  }
  log_ok "Added member ${i} to open group"
done

# ── Create Group 2: Second open group (for comparison) ───────────────

log_info "Creating second demo group..."
invoke "$SAVINGS_CONTRACT_ID" create_group \
  --admin "$DEPLOYER" \
  --group_id seed-weekly-group \
  --name "Weekly Savings Demo" \
  --contribution_amount 50000000 \
  --total_members 3 \
  --frequency Weekly \
  --start_timestamp "$start_time_2" \
  --is_public true \
  --treasury "$DEPLOYER" \
  --token_address None

log_ok "Created 'Weekly Savings Demo' (seed-weekly-group)"

# ── Summary ───────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}🎉 Sandbox seed complete!${NC}"
echo ""
echo "📋 Created groups:"
echo -e "  ${BLUE}seed-open-group${NC}     - Open Demo Group (3/5 members, Weekly)"
echo -e "  ${BLUE}seed-weekly-group${NC}   - Weekly Savings Demo (1/3 members, Weekly)"
echo ""
echo "💡 Open groups will transition to Active when all member slots are filled."
echo "   Frontend devs can browse and interact with these immediately."
