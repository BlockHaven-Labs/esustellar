#!/bin/bash

# EsuStellar Contract Deployment Script
# This script builds and deploys the savings contract to Stellar Testnet

set -e

echo "🚀 EsuStellar Contract Deployment"
echo "=================================="

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Please install it first:"
    echo "   cargo install --locked stellar-cli --features opt"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"
CONTRACT_DIR="contracts/savings"

echo ""
echo "📝 Step 1: Building contract..."
echo "--------------------------------"
cd $CONTRACT_DIR
stellar contract build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo "❌ Build failed"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Optimization successful${NC}"
else
    echo "❌ Optimization failed"
    exit 1
fi

echo ""
echo "📝 Step 3: Deploying to ${NETWORK}..."
echo "--------------------------------"

# Generate identity if it doesn't exist
if ! stellar keys ls | grep -q "deployer"; then
    echo "Creating deployer identity..."
    stellar keys generate deployer --network $NETWORK
fi

# Fund the account on testnet
if [ "$NETWORK" = "testnet" ]; then
    echo "Funding deployer account..."
    stellar keys fund deployer --network $NETWORK
fi

# Deploy contract
CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/savings/target/wasm32v1-none/release/esustellar_savings.wasm \
    --source-account deployer \
    --network $NETWORK)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
    echo ""
    echo "📋 Contract Details:"
    echo "===================="
    echo -e "Contract ID: ${BLUE}${CONTRACT_ID}${NC}"
    echo "Network: $NETWORK"
    echo ""
    echo "💾 Saving contract ID to .env..."
    echo "CONTRACT_ID=$CONTRACT_ID" > ../../apps/web/.env.local
    echo -e "${GREEN}✅ Saved to apps/web/.env.local${NC}"
else
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update your frontend with the contract ID"
echo "2. Test contract functions using the Stellar CLI"
echo "3. Monitor transactions on:"
echo "   https://stellar.expert/explorer/$NETWORK/contract/$CONTRACT_ID"

# Save deployment info
cat > deployment-info.json <<EOF
{
  "contract_id": "$CONTRACT_ID",
  "network": "$NETWORK",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "deployer"
}
EOF

echo ""
echo "📄 Deployment info saved to deployment-info.json"