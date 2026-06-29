#!/bin/bash
# validate-env.sh — Check required environment variables before deployment.
# Usage: ./infra/scripts/deploy/validate-env.sh [env-file]
#
# Exits 0 if all required vars are present and non-empty, 1 otherwise.
set -euo pipefail

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

errors=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "❌ Missing or empty: $var"
    errors=$((errors + 1))
  else
    echo "✅ $var"
  fi
done

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "❌ $errors required variable(s) not set. Aborting deployment."
  exit 1
fi

echo ""
echo "✅ All required env vars are set."
