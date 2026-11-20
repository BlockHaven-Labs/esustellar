#!/bin/bash
# rotate-deployer-keypair.sh — Rotate the Stellar deployer keypair without downtime.
# Usage: ./infra/scripts/rotate-deployer-keypair.sh [network]
#
# Steps:
#   0. Confirm no deployment, migration or signed-but-unsubmitted transaction is in flight
#   1. Generate a new deployer keypair (deployer-new)
#   2. Fund the new account on testnet, or prompt for mainnet with balance verification
#   3. Write new credentials to a restricted file (NOT stdout) for CI/CD secret update
#   4. Verify the new key can sign a transaction for its address (offline check,
#      nothing is submitted) before the old key is touched
#   5. Keep the old key as deployer-old (rollback copy) instead of deleting it
#   6. Rename deployer-new → deployer
#   7. Record the date in infra/secrets/last-rotated.yml (commit the change)
#
# The caller must update their CI/CD secrets (DEPLOYER_SECRET_KEY) with the
# new secret key from the credentials file before the next deployment.
# The old key (deployer-old) is kept as a rollback safety net. It is NOT deleted
# automatically: remove it with `stellar keys rm deployer-old` once the new key
# works in CI/CD (24h is a sensible minimum) and no deployed contract still names
# the old address as its admin.
#
# SECURITY: run this only in an interactive terminal that is not logged or
# recorded (no `script`, no terminal session recording, no CI job log capture).
# The new secret key is never printed; it is written to a private file. Tracing
# (`bash -x`, `set -x`) would print it, so tracing is switched off below.
set -euo pipefail

# Never trace this script: xtrace would write the secret key into the terminal
# or log. This also overrides `bash -x script` and an inherited SHELLOPTS=xtrace.
set +x
# Anything this script creates (the credentials file) is private by default.
umask 077

NETWORK="${1:-testnet}"
OLD_KEY="deployer"
NEW_KEY="deployer-new"
OLD_KEY_BACKUP="deployer-old"
CREDS_FILE=""   # created with mktemp in Step 3

command -v stellar >/dev/null 2>&1 || { echo "❌ stellar CLI not found"; exit 1; }

# Anything that is not testnet takes the mainnet branch below, which moves real
# funds. Refuse typos such as "testnett" instead of silently treating them as mainnet.
case "$NETWORK" in
  testnet|mainnet|public) ;;
  *)
    echo "❌ Unknown network '$NETWORK'. Use 'testnet' or 'mainnet'." >&2
    exit 1
    ;;
esac

cleanup() {
  if [ -n "$CREDS_FILE" ] && [ -f "$CREDS_FILE" ]; then
    shred -u "$CREDS_FILE" 2>/dev/null || rm -f "$CREDS_FILE"
  fi
}
trap cleanup EXIT

# The stellar CLI has no "keys rename". Copy an identity under a new name instead,
# then remove the old name. The secret goes through stdin, never the command line:
# `stellar keys add NAME --secret-key VALUE` is rejected by the CLI (the flag takes
# no value, the secret is read from stdin) and an argument would also be visible in
# the process list and echoed back in the CLI's error message.
#
# An identity created from a seed phrase (what `stellar keys generate` stores) is
# copied by its phrase, so the copy is still a seed-phrase identity and
# `stellar keys show NAME --phrase` keeps working. Importing the raw secret key
# would turn it into a secret_key identity and drop the phrase. Other identities are
# copied by secret key. The CLI writes both through the same path, so the copy gets
# the same file permissions as any CLI key. An identity in the OS secure store has no
# readable secret, so it cannot be copied and this returns non-zero rather than
# downgrading it to a plaintext key.
#
# Returns 0 only when the copy has the same address (and the same phrase or secret)
# as the source. A copy that fails verification is removed again.
copy_identity() {
  local src="$1" dst="$2" src_public dst_public src_phrase="" src_secret="" dst_check=""
  src_public=$(stellar keys address "$src" 2>/dev/null) || return 1
  if src_phrase=$(stellar keys show "$src" --phrase 2>/dev/null) && [ -n "$src_phrase" ]; then
    printf '%s\n' "$src_phrase" | stellar keys add "$dst" --seed-phrase || return 1
    dst_check=$(stellar keys show "$dst" --phrase 2>/dev/null || true)
    [ "$dst_check" = "$src_phrase" ] || { stellar keys rm "$dst" || true; return 1; }
  else
    src_secret=$(stellar keys show "$src" 2>/dev/null) || return 1
    [ -n "$src_secret" ] || return 1
    printf '%s\n' "$src_secret" | stellar keys add "$dst" --secret-key || return 1
    dst_check=$(stellar keys show "$dst" 2>/dev/null || true)
    [ "$dst_check" = "$src_secret" ] || { stellar keys rm "$dst" || true; return 1; }
  fi
  dst_public=$(stellar keys address "$dst" 2>/dev/null || true)
  [ "$dst_public" = "$src_public" ] || { stellar keys rm "$dst" || true; return 1; }
  return 0
}

echo "🔑 EsuStellar Deployer Keypair Rotation"
echo "========================================"
echo "Network: $NETWORK"
echo "⚠️  Run this only in an interactive terminal that is not logged or recorded."
echo "   The new secret key is written to a private file and is never printed."
echo ""

# Step 0: In-flight operations (see docs/runbooks/deployer-keypair-rotation.md).
# Transactions already signed with the old key are not cancelled by rotating:
# this script only changes which key this machine and CI use, not the old
# account on the network. And a contract that stored the old address as its
# admin keeps requiring that address after rotation. Make the operator confirm
# that nothing is mid-flight before any key is touched.
echo "Step 0: Checking for in-flight operations..."
OLD_PUBLIC=$(stellar keys address "$OLD_KEY" 2>/dev/null || true)
if [ -n "$OLD_PUBLIC" ]; then
  echo "  Current deployer account: $OLD_PUBLIC"
  echo "  If this address is the admin of any deployed contract, keep '$OLD_KEY_BACKUP' until that admin is no longer needed."
fi
if [ "${ROTATION_CONFIRM_NO_INFLIGHT:-}" = "yes" ]; then
  echo "  ✅ ROTATION_CONFIRM_NO_INFLIGHT=yes: operator has confirmed nothing is in flight."
else
  echo "  Confirm ALL of the following before continuing:"
  echo "    - no deployment or migration (e.g. contracts/migration_coordinator) is running or about to run"
  echo "    - no transaction signed with the old key is waiting to be submitted"
  read -rp "  Is nothing in flight? [y/N] " inflight
  if [[ "${inflight,,}" != "y" ]]; then
    echo "❌ Rotation aborted. Finish or cancel the in-flight work, then re-run."
    exit 1
  fi
fi
echo ""

# A deployer-old left over from an earlier rotation may be the only local copy of
# an older key (for example one that is still a contract admin). Never replace it
# silently: stop before anything has been changed.
if stellar keys ls | awk '{print $1}' | grep -xq "$OLD_KEY_BACKUP"; then
  echo "❌ '$OLD_KEY_BACKUP' already exists from an earlier rotation. Nothing has been changed." >&2
  echo "   Once you no longer need it, remove it with: stellar keys rm $OLD_KEY_BACKUP" >&2
  echo "   Then re-run this script." >&2
  exit 1
fi

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
  HORIZON_URL="${HORIZON_URL:-https://horizon.stellar.org}"
  MIN_BALANCE_XLM="${MIN_BALANCE_XLM:-10}"
  BALANCE_CHECK_ATTEMPTS="${BALANCE_CHECK_ATTEMPTS:-6}"
  BALANCE_CHECK_DELAY_SECONDS="${BALANCE_CHECK_DELAY_SECONDS:-5}"

  # Horizon can take a few seconds to show a freshly funded account (it returns
  # 404 until the account exists), so retry before treating that as a failure.
  BALANCE="0"
  attempt=1
  while [ "$attempt" -le "$BALANCE_CHECK_ATTEMPTS" ]; do
    BALANCE=$(curl -fsS "$HORIZON_URL/accounts/$NEW_PUBLIC" 2>/dev/null \
      | python3 -c 'import sys,json; print(next((b["balance"] for b in json.load(sys.stdin)["balances"] if b["asset_type"]=="native"), "0"))' \
      2>/dev/null || echo "0")
    if python3 -c "import sys; sys.exit(0 if float('$BALANCE') >= float('$MIN_BALANCE_XLM') else 1)"; then
      break
    fi
    if [ "$attempt" -lt "$BALANCE_CHECK_ATTEMPTS" ]; then
      echo "  ⏳ Balance is $BALANCE XLM (need $MIN_BALANCE_XLM); retrying in ${BALANCE_CHECK_DELAY_SECONDS}s ($attempt/$BALANCE_CHECK_ATTEMPTS)..."
      sleep "$BALANCE_CHECK_DELAY_SECONDS"
    fi
    attempt=$((attempt + 1))
  done
  if ! python3 -c "import sys; sys.exit(0 if float('$BALANCE') >= float('$MIN_BALANCE_XLM') else 1)"; then
    echo "  ❌ Horizon reports $BALANCE XLM for $NEW_PUBLIC (minimum $MIN_BALANCE_XLM) after $BALANCE_CHECK_ATTEMPTS attempts. Fund the account and re-run." >&2
    echo "     Nothing has been changed: the old key '$OLD_KEY' is untouched." >&2
    exit 1
  fi
  echo "  ✅ Mainnet account funded. Current balance: $BALANCE XLM"
fi

# Step 3: Write credentials to restricted file (not stdout)
echo ""
CREDS_FILE="$(mktemp "${TMPDIR:-/tmp}/deployer-rotation-creds.XXXXXX")"
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

# Step 4: Verify the new key before the old one is touched.
# This is an offline check, not a network dry run: it proves the key in the
# keystore loads, is the secret that was written for CI/CD, and signs a
# transaction whose signature belongs to NEW_PUBLIC. It does not submit anything
# and it cannot see whether DEPLOYER_SECRET_KEY was updated in CI/CD. Funding is
# checked in Step 2 on mainnet only. Any failure aborts before Step 5, so the old
# key is still in place.
echo ""
echo "Step 4: Verifying new key can sign (offline check, nothing is submitted)..."
if ! stellar keys ls | awk '{print $1}' | grep -xq "$NEW_KEY"; then
  echo "  ❌ New key '$NEW_KEY' not found in local keystore. '$OLD_KEY' is untouched." >&2
  exit 1
fi
VERIFY_PUBLIC=$(stellar keys address "$NEW_KEY" 2>/dev/null || true)
if [ "$VERIFY_PUBLIC" != "$NEW_PUBLIC" ]; then
  echo "  ❌ New key verification failed: address mismatch. '$OLD_KEY' is untouched." >&2
  exit 1
fi
VERIFY_SECRET=$(stellar keys show "$NEW_KEY" 2>/dev/null || true)
if [ -z "$NEW_SECRET" ] || [ "$VERIFY_SECRET" != "$NEW_SECRET" ]; then
  echo "  ❌ Could not read back the new secret key, or it differs from the one written to the credentials file. '$OLD_KEY' is untouched." >&2
  exit 1
fi
case "$NETWORK" in
  testnet) NETWORK_PASSPHRASE="Test SDF Network ; September 2015" ;;
  *)       NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015" ;;
esac
# A bump_sequence transaction from the new account, signed locally and never sent.
TX_JSON='{"tx":{"tx":{"source_account":"'"$NEW_PUBLIC"'","fee":100,"seq_num":1,"cond":"none","memo":"none","operations":[{"source_account":null,"body":{"bump_sequence":{"bump_to":2}}}],"ext":"v0"},"signatures":[]}}'
SIGN_CHECK='
import base64, json, sys
try:
    raw = base64.b32decode(sys.argv[1])
    if len(raw) != 35 or raw[0] != 6 << 3:
        sys.exit(1)
    hint = raw[1:33][-4:].hex()
    sigs = json.load(sys.stdin)["tx"]["signatures"]
    ok = len(sigs) == 1 and sigs[0]["hint"] == hint and len(sigs[0]["signature"]) == 128
except Exception:
    sys.exit(1)
sys.exit(0 if ok else 1)
'
if ! printf '%s' "$TX_JSON" \
    | stellar xdr encode --type TransactionEnvelope --input json 2>/dev/null \
    | stellar tx sign --sign-with-key "$NEW_KEY" --network-passphrase "$NETWORK_PASSPHRASE" 2>/dev/null \
    | stellar xdr decode --type TransactionEnvelope --output json 2>/dev/null \
    | python3 -c "$SIGN_CHECK" "$NEW_PUBLIC"; then
  echo "  ❌ New key could not produce a valid signature for $NEW_PUBLIC. Nothing has been changed: '$OLD_KEY' is untouched." >&2
  exit 1
fi
echo "  ✅ New key verified (address matches and it signs for $NEW_PUBLIC)."

# Step 5: Rename old key to deployer-old (grace period) instead of deleting
echo ""
echo "Step 5: Backing up old keypair '$OLD_KEY' to '$OLD_KEY_BACKUP' (rollback copy)..."
BACKED_UP=0
if stellar keys ls | awk '{print $1}' | grep -xq "$OLD_KEY"; then
  if ! copy_identity "$OLD_KEY" "$OLD_KEY_BACKUP"; then
    # Dropping the old key without a verified rollback copy is the one thing this
    # step must never do. Stop with the old key untouched.
    echo "  ❌ Could not make a verified copy of '$OLD_KEY' as '$OLD_KEY_BACKUP' (its secret may be unreadable, or it may live in the OS secure store)." >&2
    echo "     Stopping with '$OLD_KEY' untouched. '$NEW_KEY' is still in the keystore." >&2
    exit 1
  fi
  stellar keys rm "$OLD_KEY"
  BACKED_UP=1
  echo "  ✅ Old keypair backed up as '$OLD_KEY_BACKUP' (retained for rollback)."
else
  echo "  ℹ️  '$OLD_KEY' not found locally — skipping backup."
fi

# Step 6: Rename new → deployer
echo ""
echo "Step 6: Renaming '$NEW_KEY' to '$OLD_KEY'..."
# copy_identity verifies the copy (same address and phrase or secret) before the
# new name is removed, so a failed rename never leaves the new key unreachable.
if copy_identity "$NEW_KEY" "$OLD_KEY"; then
  stellar keys rm "$NEW_KEY"
  echo "  ✅ Keypair renamed to '$OLD_KEY'."
else
  echo "  ❌ Could not rename '$NEW_KEY' to '$OLD_KEY'; keeping '$NEW_KEY' in place." >&2
  if [ "$BACKED_UP" = "1" ]; then
    echo "     The previous key is safe as '$OLD_KEY_BACKUP'." >&2
  fi
  exit 1
fi

# Record the rotation date so infra/secrets/last-rotated.yml (read daily by
# .github/workflows/secret-rotation-check.yml) restarts the 90-day clock. This
# only edits the working tree; commit the change. It is skipped when the script
# is run outside the repository root.
TRACKER="infra/secrets/last-rotated.yml"
if [ -f "$TRACKER" ]; then
  python3 - "$TRACKER" "$(date -u +%Y-%m-%d)" <<'PY' && echo "  ✅ Updated $TRACKER (commit it)." || echo "  ⚠️  Could not update $TRACKER; set DEPLOYER_SECRET_KEY last_rotated to today by hand."
import re, sys
path, today = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
pattern = re.compile(r'(^DEPLOYER_SECRET_KEY:\n(?:[ \t]+.*\n)*?[ \t]+last_rotated:\s*)"[^"]*"', re.M)
new, count = pattern.subn(lambda m: m.group(1) + '"' + today + '"', text, count=1)
if count != 1:
    sys.exit(1)
open(path, "w", encoding="utf-8").write(new)
PY
else
  echo "  ⚠️  $TRACKER not found (run from the repo root); set DEPLOYER_SECRET_KEY last_rotated to today by hand."
fi

echo ""
echo "🎉 Keypair rotation complete."
echo "   Remember to update DEPLOYER_SECRET_KEY in your CI/CD environment."
if [ "$BACKED_UP" = "1" ]; then
  if stellar keys show "$OLD_KEY_BACKUP" --phrase >/dev/null 2>&1; then
    ROLLBACK_SHOW="stellar keys show $OLD_KEY_BACKUP --phrase"
  else
    ROLLBACK_SHOW="stellar keys show $OLD_KEY_BACKUP"
  fi
  echo ""
  echo "   The old key is kept as '$OLD_KEY_BACKUP'. It is NOT deleted automatically."
  echo "   If the CI/CD secret update fails or the new key misbehaves, roll back:"
  echo "       $ROLLBACK_SHOW | stellar keys add $OLD_KEY --overwrite"
  echo "   and put the old secret back in DEPLOYER_SECRET_KEY."
  echo "   Once the new key works in CI/CD (24h is a sensible minimum) and no deployed"
  echo "   contract names the old address as admin, remove the old key with:"
  echo "       stellar keys rm $OLD_KEY_BACKUP"
fi
echo "   Credentials file: $CREDS_FILE (will be auto-shredded on exit)"