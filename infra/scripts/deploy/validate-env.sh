#!/usr/bin/env bash
# Validates that all required env vars are set and non-empty before deployment.
# Usage: source .env && bash infra/scripts/deploy/validate-env.sh
set -euo pipefail

REQUIRED_VARS=(
  "STELLAR_NETWORK"
  "NEXT_PUBLIC_REGISTRY_CONTRACT_ID"
  "NEXT_PUBLIC_SAVINGS_CONTRACT_ID"
  "NEXT_PUBLIC_CONTRACT_ID"
  "DEPLOYER_SECRET_KEY"
)

MISSING=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: The following required environment variables are missing or empty:"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  exit 1
fi

echo "All required environment variables are set."
