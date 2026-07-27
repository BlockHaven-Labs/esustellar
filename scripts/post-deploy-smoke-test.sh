#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🧪 EsuStellar Post-Deploy Contract Smoke Tests"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(pwd)"
DEPLOYMENT_INFO="$ROOT_DIR/deployment-info.json"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

REGISTRY_ID=""
SAVINGS_ID=""
NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-deployer}"

# Parse CLI flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --registry)
      REGISTRY_ID="$2"
      shift 2
      ;;
    --savings)
      SAVINGS_ID="$2"
      shift 2
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --source-account)
      SOURCE_ACCOUNT="$2"
      shift 2
      ;;
    *)
      echo -e "${YELLOW}Unknown option: $1${NC}"
      shift
      ;;
  esac
done

# Try loading from deployment-info.json if missing
if [ -z "$REGISTRY_ID" ] && [ -f "$DEPLOYMENT_INFO" ]; then
  REGISTRY_ID=$(grep -o '"registry_contract_id": "[^"]*"' "$DEPLOYMENT_INFO" | cut -d'"' -f4 || true)
fi

if [ -z "$SAVINGS_ID" ] && [ -f "$DEPLOYMENT_INFO" ]; then
  SAVINGS_ID=$(grep -o '"savings_contract_id": "[^"]*"' "$DEPLOYMENT_INFO" | cut -d'"' -f4 || true)
fi

# Try loading from apps/web/.env.local if still missing
if [ -z "$REGISTRY_ID" ] && [ -f "$ENV_FILE" ]; then
  REGISTRY_ID=$(grep '^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=' "$ENV_FILE" | cut -d'=' -f2 || true)
fi

if [ -z "$SAVINGS_ID" ] && [ -f "$ENV_FILE" ]; then
  SAVINGS_ID=$(grep '^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=' "$ENV_FILE" | cut -d'=' -f2 || true)
fi

if [ -z "$SAVINGS_ID" ] && [ -f "$ENV_FILE" ]; then
  SAVINGS_ID=$(grep '^NEXT_PUBLIC_CONTRACT_ID=' "$ENV_FILE" | cut -d'=' -f2 || true)
fi

echo -e "Network:   ${BLUE}${NETWORK}${NC}"
echo -e "Deployer:  ${BLUE}${SOURCE_ACCOUNT}${NC}"
echo -e "Registry:  ${BLUE}${REGISTRY_ID:-Not specified}${NC}"
echo -e "Savings:   ${BLUE}${SAVINGS_ID:-Not specified}${NC}"
echo "=================================================="

# Verify CLI availability
if ! command -v stellar >/dev/null 2>&1; then
  echo -e "${RED}❌ Stellar CLI not found in PATH${NC}"
  echo "Skipping contract invocation tests (Stellar CLI required)."
  exit 1
fi

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_smoke_test() {
  local contract_name="$1"
  local contract_id="$2"
  local fn_name="$3"
  shift 3
  local fn_args=("$@")

  TESTS_RUN=$((TESTS_RUN + 1))
  echo -n -e "Testing ${BLUE}${contract_name}${NC} -> ${YELLOW}${fn_name}${NC}... "

  if [ -z "$contract_id" ]; then
    echo -e "${RED}FAILED (Contract ID missing)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return
  fi

  local cmd=(stellar contract invoke --id "$contract_id" --source-account "$SOURCE_ACCOUNT" --network "$NETWORK" -- "$fn_name")
  if [ ${#fn_args[@]} -gt 0 ]; then
    cmd+=("${fn_args[@]}")
  fi

  if output=$("${cmd[@]}" 2>&1); then
    echo -e "${GREEN}PASSED${NC}"
    echo -e "  └─ Output: ${output}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}FAILED${NC}"
    echo -e "  └─ Error: ${output}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

echo ""
echo "🔍 Testing Registry Contract core read functions..."
run_smoke_test "Registry" "$REGISTRY_ID" "get_group_count"
run_smoke_test "Registry" "$REGISTRY_ID" "get_all_groups"
run_smoke_test "Registry" "$REGISTRY_ID" "get_all_public_groups"

echo ""
echo "🔍 Testing Savings Contract core read functions..."
run_smoke_test "Savings" "$SAVINGS_ID" "get_all_groups"

echo ""
echo "=================================================="
echo -e "Smoke Test Summary: ${TESTS_RUN} Run | ${GREEN}${TESTS_PASSED} Passed${NC} | ${RED}${TESTS_FAILED} Failed${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All post-deploy smoke tests PASSED!${NC}"
  exit 0
else
  echo -e "${RED}❌ Smoke tests FAILED with ${TESTS_FAILED} errors.${NC}"
  exit 1
fi
