#!/usr/bin/env bash
# Validates the current shell environment against the variable names
# listed in infra/secrets/templates/.env.example. Companion to
# infra/scripts/deploy/validate-env.sh, which only checks the
# web-frontend (NEXT_PUBLIC_*) variables.
set -euo pipefail

TEMPLATE="infra/secrets/templates/.env.example"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Template not found: $TEMPLATE" >&2
  exit 1
fi

missing=()
while IFS='=' read -r key _; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done < "$TEMPLATE"

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required infra environment variables:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "OK: all infra environment variables from $TEMPLATE are set"
