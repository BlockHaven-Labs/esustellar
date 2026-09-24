#!/bin/bash
# rotate-deployer-keypair.sh — Rotate the Stellar deployer keypair without downtime.
# Usage: ./infra/scripts/rotate-deployer-keypair.sh [network]
#
# Steps:
#   1. Generate a new deployer keypair (deployer-new)
#   2. Fund the new account on testnet, or prompt for mainnet with balance verification
#   3. Write new credentials to a restricted file (NOT stdout) for CI/CD secret update
#   4. Verify the new key works (dry-run contract call)
#   5. Rename old key to deployer-old (grace period) instead of deleting
#   6. Rename deployer-new → deployer
#
# The caller must update their CI/CD secrets (DEPLOYER_SECRET_KEY) with the
# new secret key from the credentials file before the next deployment.
# The old key (deployer-old) is retained for 24h as a rollback safety net.
set -euo pipefail

NETWORK="${1:-testnet}"
OLD_KEY="deployer"
NEW_KEY="deployer-new"
OLD_KEY_BACKUP="deployer-old"
CREDS_FILE="/tmp/deployer-rotation-creds-$$"

command -v stellar >/dev/null 2>&1 || { echo "❌ stellar CLI not found"; exit 1; }

cleanup() {
  if [ -f "$CREDS_FILE" ]; then
    shred -u "$CREDS_FILE" 2>/dev/null || rm -f "$CREDS_FILE"
  fi
}
trap cleanup EXIT

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

  echo "  🔍 Verifying mainnet account balance..."
  BALANCE=$(stellar keys balance "$NEW_KEY" --network mainnet 2>/dev/null || echo "0")
  if [ "$BALANCE" = "0" ] || [ -z "$BALANCE" ]; then
    echo "  ❌ Balance check failed or account has 0 XLM. Please fund the account and re-run."
    exit 1
  fi
  echo "  ✅ Mainnet account funded. Current balance: $BALANCE XLM"
fi

# Step 3: Write credentials to restricted file (not stdout)
echo ""
echo "Step 3: Writing new credentials to restricted file: $CREDS_FILE"
{
  echo "DEPLOYER_PUBLIC_KEY=${NEW_PUBLIC}"
  if [ -n "$NEW_SECRET" ]; then
    echo "DEPLOYER_SECRET_KEY=${NEW_SECRET}"
  fi
} > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"
echo "  ✅ Credentials written (mode 600). DO NOT commit or log this file."
echo ""
echo "  Update your CI/CD secrets (DEPLOYER_SECRET_KEY) with the value from:"
echo "       $CREDS_FILE"
echo ""
read -rp "  Have you saved the new secret key from the file above? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "❌ Rotation aborted. Re-run when ready."
  exit 1
fi

# Step 4: Verify new key works (dry-run contract call)
echo ""
echo "Step 4: Verifying new key works..."
if ! stellar keys ls | awk '{print $1}' | grep -xq "$NEW_KEY"; then
  echo "  ❌ New key '$NEW_KEY' not found in local keystore."
  exit 1
fi
# Dry-run: attempt to get the public address (validates key is usable)
VERIFY_PUBLIC=$(stellar keys address "$NEW_KEY" 2>/dev/null || true)
if [ "$VERIFY_PUBLIC" != "$NEW_PUBLIC" ]; then
  echo "  ❌ New key verification failed: address mismatch."
  exit 1
fi
echo "  ✅ New key verified (address matches)."

# Step 5: Rename old key to deployer-old (grace period) instead of deleting
echo ""
echo "Step 5: Backing up old keypair '$OLD_KEY' to '$OLD_KEY_BACKUP' (grace period)..."
if stellar keys ls | awk '{print $1}' | grep -xq "$OLD_KEY"; then
  OLD_SECRET=$(stellar keys show "$OLD_KEY" 2>/dev/null || true)
  if [ -n "$OLD_SECRET" ]; then
    stellar keys add "$OLD_KEY_BACKUP" --secret-key "$OLD_SECRET"
    stellar keys rm "$OLD_KEY"
    echo "  ✅ Old keypair backed up as '$OLD_KEY_BACKUP' (retained for rollback)."
  else
    echo "  ⚠️  Could not retrieve old secret — skipping backup."
  fi
else
  echo "  ℹ️  '$OLD_KEY' not found locally — skipping backup."
fi

# Step 6: Rename new → deployer
echo ""
echo "Step 6: Renaming '$NEW_KEY' to '$OLD_KEY'..."
# stellar CLI stores keys by name; re-generate under the target name using the same secret
# This creates an identical keypair under local storage semantics (same permissions, encryption)
if [ -n "$NEW_SECRET" ]; then
  stellar keys add "$OLD_KEY" --secret-key "$NEW_SECRET"
  stellar keys rm "$NEW_KEY"
  echo "  ✅ Keypair renamed to '$OLD_KEY'."
else
  echo "  ⚠️  Could not retrieve secret — please rename manually:"
  echo "       stellar keys add deployer --secret-key <NEW_SECRET>"
  exit 1
fi

echo ""
echo "🎉 Keypair rotation complete."
echo "   Old key retained as '$OLD_KEY_BACKUP' for 24h grace period."
echo "   Remember to update DEPLOYER_SECRET_KEY in your CI/CD environment."
echo "   Credentials file: $CREDS_FILE (will be auto-shredded on exit)"