#!/bin/bash
set -e

echo "🚀 EsuStellar Testnet Contract Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

NETWORK="testnet"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$ENV_DIR/../.." && pwd)"
REGISTRY_DIR="$ROOT_DIR/contracts/registry"
SAVINGS_DIR="$ROOT_DIR/contracts/savings"
REGISTRY_WASM="$ROOT_DIR/target/wasm32v1-none/release/group_registry.wasm"
SAVINGS_WASM="$ROOT_DIR/target/wasm32v1-none/release/esustellar_savings.wasm"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"
DEPLOYMENT_INFO="$ENV_DIR/deployment-info.json"

# Check CLI
command -v stellar >/dev/null 2>&1 || {
  echo "❌ Stellar CLI not found"
  exit 1
}

echo ""
echo -e "${YELLOW}📝 Step 1: Building contracts...${NC}"

# Build registry contract
echo "Building registry contract..."
cd "$REGISTRY_DIR"
stellar contract build
cd "$ROOT_DIR"
echo -e "${GREEN}✅ Registry contract built${NC}"

# Build savings contract
echo "Building savings contract..."
cd "$SAVINGS_DIR"
stellar contract build
cd "$ROOT_DIR"
echo -e "${GREEN}✅ Savings contract built${NC}"

echo ""
echo -e "${YELLOW}📝 Step 2: Preparing deployer identity...${NC}"
if ! stellar keys ls | awk '{print $1}' | grep -xq deployer; then
  stellar keys generate deployer --network "$NETWORK"
fi

echo "Funding deployer account (if needed)..."
stellar keys fund deployer --network "$NETWORK" || true

echo ""
echo -e "${YELLOW}📝 Step 3: Deploying Registry Contract...${NC}"
REGISTRY_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$REGISTRY_WASM" \
  --source-account deployer \
  --network "$NETWORK")

echo -e "${GREEN}✅ Registry deployment successful${NC}"
echo -e "Registry Contract ID: ${BLUE}${REGISTRY_CONTRACT_ID}${NC}"

echo ""
echo -e "${YELLOW}📝 Step 4: Deploying Savings Contract...${NC}"
SAVINGS_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$SAVINGS_WASM" \
  --source-account deployer \
  --network "$NETWORK")

echo -e "${GREEN}✅ Savings deployment successful${NC}"
echo -e "Savings Contract ID: ${BLUE}${SAVINGS_CONTRACT_ID}${NC}"

echo ""
echo -e "${YELLOW}💾 Updating frontend env...${NC}"
mkdir -p "$(dirname "$ENV_FILE")"

# Create or update .env.local file
{
  # Preserve existing env vars that aren't contract IDs
  if [ -f "$ENV_FILE" ]; then
    grep -v '^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=' "$ENV_FILE" 2>/dev/null | \
    grep -v '^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=' | \
    grep -v '^NEXT_PUBLIC_CONTRACT_ID=' || true
  fi
  
  # Add contract IDs with NEXT_PUBLIC_ prefix
  echo "NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$REGISTRY_CONTRACT_ID"
  echo "NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$SAVINGS_CONTRACT_ID"
  
  # Legacy support - keep CONTRACT_ID pointing to savings
  echo "NEXT_PUBLIC_CONTRACT_ID=$SAVINGS_CONTRACT_ID"
} > "$ENV_FILE.tmp"

mv "$ENV_FILE.tmp" "$ENV_FILE"
echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"

# Create deployment info file
cat > "$DEPLOYMENT_INFO" <<EOF
{
  "registry_contract_id": "$REGISTRY_CONTRACT_ID",
  "savings_contract_id": "$SAVINGS_CONTRACT_ID",
  "network": "$NETWORK",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "deployer"
}
EOF

echo ""
echo -e "${GREEN}🎉 Testnet deployment complete!${NC}"
echo ""
echo "📋 Contract IDs:"
echo -e "  Registry: ${BLUE}${REGISTRY_CONTRACT_ID}${NC}"
echo -e "  Savings:  ${BLUE}${SAVINGS_CONTRACT_ID}${NC}"
echo ""
echo "🔍 Explorers:"
echo "  Registry: https://stellar.expert/explorer/$NETWORK/contract/$REGISTRY_CONTRACT_ID"
echo "  Savings:  https://stellar.expert/explorer/$NETWORK/contract/$SAVINGS_CONTRACT_ID"
echo ""
echo "💾 Deployment info saved to: $DEPLOYMENT_INFO"
echo ""
echo "💡 Next Steps:"
echo "  1. When creating savings groups, register them in the registry"
echo "  2. When users join groups, update registry membership"
echo "  3. Use registry for group discovery in the frontend"
