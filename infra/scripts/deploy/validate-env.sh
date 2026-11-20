#!/bin/bash
# validate-env.sh — Check required environment variables before deployment.
# Usage: ./infra/scripts/deploy/validate-env.sh [env-file]
#        ./infra/scripts/deploy/validate-env.sh --check-deployer-key [env-file]
#        ./infra/scripts/deploy/validate-env.sh --infra-env PATH/TO/.env
#
# --infra-env delegates to infra/scripts/validate-infra-env.sh, which checks an
# infra-level .env against infra/secrets/templates/.env.example with the same
# rigor this script applies to the app-level env file.
#
# By default validates the frontend contract IDs. Pass --check-deployer-key
# (or set CHECK_DEPLOYER_KEY=1) to additionally require the Stellar deployer
# account secret key (DEPLOYER_SECRET_KEY) used by contract deploys/rotations.
#
# Exits 0 if all required vars are present and non-empty, 1 otherwise.
set -euo pipefail

CHECK_DEPLOYER_KEY=0

if [ "${1:-}" = "--infra-env" ]; then
  shift
  if [ $# -lt 1 ]; then
    echo "--infra-env requires an env file path" >&2
    exit 2
  fi
  exec bash "$(dirname "$0")/../validate-infra-env.sh" "$1"
fi

if [ "${1:-}" = "--check-deployer-key" ] || [ "${CHECK_DEPLOYER_KEY:-0}" = "1" ]; then
  CHECK_DEPLOYER_KEY=1
fi
if [ "${1:-}" = "--check-deployer-key" ]; then
  shift
fi

# #1497: --deploy (or CHECK_DEPLOY_VARS=1) also validates deployment-level secrets
# documented in infra/docs/secrets.md and infra/secrets/README.md.
CHECK_DEPLOY_VARS="${CHECK_DEPLOY_VARS:-0}"
if [ "${1:-}" = "--deploy" ]; then
  CHECK_DEPLOY_VARS=1
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

if [ "$CHECK_DEPLOYER_KEY" = "1" ] || [ "$CHECK_DEPLOY_VARS" = "1" ]; then
  REQUIRED_VARS+=("DEPLOYER_SECRET_KEY")
fi

if [ "$CHECK_DEPLOY_VARS" = "1" ]; then
  REQUIRED_VARS+=("STELLAR_RPC_URL" "STELLAR_NETWORK_PASSPHRASE" "NEXTAUTH_SECRET")
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