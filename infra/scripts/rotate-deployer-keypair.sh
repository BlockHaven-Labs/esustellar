#!/bin/bash
# rotate-deployer-keypair.sh — Rotate the Stellar deployer keypair without downtime.
# Usage: ./infra/scripts/rotate-deployer-keypair.sh [network]
#
# Steps:
#   1. Generate a new deployer keypair (deployer-new)
#   2. Fund the new account on testnet, or prompt for mainnet
#   3. Print the new public key for CI/CD secret update
#   4. Remove the old deployer identity
#   5. Rename deployer-new → deployer
#
# The caller must update their CI/CD secrets (DEPLOYER_SECRET_KEY) with the
# new secret key printed during this script before the next deployment.
set -euo pipefail

NETWORK="${1:-testnet}"
OLD_KEY="deployer"
NEW_KEY="deployer-new"

command -v stellar >/dev/null 2>&1 || { echo "❌ stellar CLI not found"; exit 1; }

echo "🔑 EsuStellar Deployer Keypair Rotation"
echo "========================================"
echo "Network: $NETWORK"
echo ""

# Step 1: Generate new keypair
echo "Step 1: Generating new keypair '$NEW_KEY'..."
if stellar keys ls | awk '{print $1}' | grep -xq "$NEW_KEY"; then
  echo "  ⚠️  '$NEW_KEY' already exists — removing before regenerating."
  stellar keys rm "$NEW_KEY"
fi
stellar keys generate "$NEW_KEY" --network "$NETWORK" --no-fund

NEW_PUBLIC=$(stellar keys address "$NEW_KEY")
NEW_SECRET=$(stellar keys show "$NEW_KEY" 2>/dev/null || true)
echo "  ✅ New public key:  $NEW_PUBLIC"

# Step 2: Fund the new account
echo ""
echo "Step 2: Funding new account..."
if [ "$NETWORK" = "testnet" ]; then
  stellar keys fund "$NEW_KEY" --network "$NETWORK"
  echo "  ✅ Testnet account funded via Friendbot."
else
  echo "  ⚠️  Mainnet detected. Fund this address manually before continuing:"
  echo "       $NEW_PUBLIC"
  read -rp "  Press ENTER once the account is funded..."
fi

# Step 3: Print rotation info
echo ""
echo "Step 3: New credentials — update CI/CD secrets NOW before proceeding:"
echo "  DEPLOYER_PUBLIC_KEY=${NEW_PUBLIC}"
if [ -n "$NEW_SECRET" ]; then
  echo "  DEPLOYER_SECRET_KEY=${NEW_SECRET}"
fi
echo ""
read -rp "  Have you saved the new secret key? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "❌ Rotation aborted. Re-run when ready."
  exit 1
fi

# Step 4: Remove old keypair
echo ""
echo "Step 4: Removing old keypair '$OLD_KEY'..."
if stellar keys ls | awk '{print $1}' | grep -xq "$OLD_KEY"; then
  stellar keys rm "$OLD_KEY"
  echo "  ✅ Old keypair removed."
else
  echo "  ℹ️  '$OLD_KEY' not found locally — skipping."
fi

# Step 5: Rename new → deployer
echo ""
echo "Step 5: Renaming '$NEW_KEY' to '$OLD_KEY'..."
# stellar CLI stores keys by name; re-generate under the target name using the same secret
if [ -n "$NEW_SECRET" ]; then
  stellar keys add "$OLD_KEY" --secret-key "$NEW_SECRET"
  stellar keys rm "$NEW_KEY"
  echo "  ✅ Keypair renamed to '$OLD_KEY'."
else
  echo "  ⚠️  Could not retrieve secret — please rename manually:"
  echo "       stellar keys add deployer --secret-key <NEW_SECRET>"
fi

echo ""
echo "🎉 Keypair rotation complete."
echo "   Remember to update DEPLOYER_SECRET_KEY in your CI/CD environment."
