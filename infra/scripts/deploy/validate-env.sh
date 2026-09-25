#!/bin/bash
# validate-env.sh — Check required environment variables before deployment.
# Usage: ./infra/scripts/deploy/validate-env.sh [env-file]
#        ./infra/scripts/deploy/validate-env.sh --check-deployer-key [env-file]
#
# By default validates the frontend contract IDs. Pass --check-deployer-key
# (or set CHECK_DEPLOYER_KEY=1) to additionally require the Stellar deployer
# account secret key (DEPLOYER_SECRET_KEY) used by contract deploys/rotations.
#
# Exits 0 if all required vars are present and non-empty, 1 otherwise.
set -euo pipefail

CHECK_DEPLOYER_KEY=0

if [ "${1:-}" = "--check-deployer-key" ] || [ "${CHECK_DEPLOYER_KEY:-0}" = "1" ]; then
  CHECK_DEPLOYER_KEY=1
fi
if [ "${1:-}" = "--check-deployer-key" ]; then
  shift
fi

ENV_FILE="${1:-apps/web/.env.local}"

# Load env file if it exists
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
fi

REQUIRED_VARS=(
  "NEXT_PUBLIC_REGISTRY_CONTRACT_ID"
  "NEXT_PUBLIC_SAVINGS_CONTRACT_ID"
  "NEXT_PUBLIC_CONTRACT_ID"
)

if [ "$CHECK_DEPLOYER_KEY" = "1" ]; then
  REQUIRED_VARS+=("DEPLOYER_SECRET_KEY")
fi

errors=0

for var in "${REQUIRED_VARS[@]}"; do
  value="${!var:-}"
  if [ -z "$value" ]; then
    echo "❌ Missing or empty: $var"
    errors=$((errors + 1))
    continue
  fi
  echo "✅ $var"
  if [ "$var" = "DEPLOYER_SECRET_KEY" ]; then
    case "$value" in
      S[A-Z0-9]*) : ;;
      *)
        echo "❌ $var does not look like a Stellar secret key (expected S…): masked"
        errors=$((errors + 1))
        ;;
    esac
  fi
done

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "❌ $errors required variable(s) not set. Aborting deployment."
  exit 1
fi

echo ""
echo "✅ All required env vars are set."