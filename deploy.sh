#!/bin/bash
set -e

echo "🚀 EsuStellar Contract Deployment"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

NETWORK="testnet"
ROOT_DIR="$(pwd)"
CONTRACT_DIR="contracts/savings"
WASM_PATH="$ROOT_DIR/target/wasm32v1-none/release/esustellar_savings.wasm"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

# Check CLI
command -v stellar >/dev/null || {
  echo "❌ Stellar CLI not found"
  exit 1
}

echo ""
echo "📝 Step 1: Building contract..."

cd "$CONTRACT_DIR"
stellar contract build

cd "$ROOT_DIR"

echo -e "${GREEN}✅ Build successful${NC}"

echo ""
echo "📝 Step 2: Preparing deployer identity..."
if ! stellar keys ls | awk '{print $1}' | grep -xq deployer; then
  stellar keys generate deployer --network "$NETWORK"
fi

if [ "$NETWORK" = "testnet" ]; then
  echo "Funding deployer account (if needed)..."
  stellar keys fund deployer --network "$NETWORK" || true
fi

echo ""
echo "📝 Step 3: Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source-account deployer \
  --network "$NETWORK")

echo -e "${GREEN}✅ Deployment successful${NC}"
echo -e "Contract ID: ${BLUE}${CONTRACT_ID}${NC}"

echo ""
echo "💾 Updating frontend env..."
mkdir -p "$(dirname "$ENV_FILE")"
grep -v '^CONTRACT_ID=' "$ENV_FILE" 2>/dev/null > "$ENV_FILE.tmp" || true
echo "CONTRACT_ID=$CONTRACT_ID" >> "$ENV_FILE.tmp"
mv "$ENV_FILE.tmp" "$ENV_FILE"
echo -e "${GREEN}✅ Updated $ENV_FILE${NC}"

cd "$ROOT_DIR"

cat > deployment-info.json <<EOF
{
  "contract_id": "$CONTRACT_ID",
  "network": "$NETWORK",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "deployer"
}
EOF

echo ""
echo "🎉 Deployment complete!"
echo "🔍 Explorer:"
echo "https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT_ID"
