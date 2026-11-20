#!/usr/bin/env bash
# Validates an environment against the variable names listed in
# infra/secrets/templates/.env.example. Companion to
# infra/scripts/deploy/validate-env.sh, which checks the web-frontend
# (NEXT_PUBLIC_*) variables.
#
# Usage:
#   validate-infra-env.sh                 # validate the current shell environment
#   validate-infra-env.sh PATH/TO/.env    # validate an infra-level env file
#
# With a file argument the values are read with a simple key=value parser
# (comments and blank lines ignored); the file is never sourced, so a value
# containing shell syntax cannot execute code.
set -euo pipefail

TEMPLATE="infra/secrets/templates/.env.example"
ENV_FILE="${1:-}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Template not found: $TEMPLATE" >&2
  exit 1
fi

if [[ -n "$ENV_FILE" && ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

# Prints the value of $1 from the env file, or from the shell when no file was
# given. Quotes around a value are stripped; nothing is evaluated.
env_value() {
  local key="$1" line value

  if [[ -z "$ENV_FILE" ]]; then
    printf '%s' "${!key:-}"
    return 0
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" == "$key="* ]] || continue
    value="${line#*=}"
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
    printf '%s' "$value"
    return 0
  done < "$ENV_FILE"

  printf ''
}

missing=()
while IFS='=' read -r key _; do
  key="${key%$'\r'}"
  [[ -z "$key" || "$key" == \#* ]] && continue
  if [[ -z "$(env_value "$key")" ]]; then
    missing+=("$key")
  fi
done < "$TEMPLATE"

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required infra environment variables:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

if [[ -n "$ENV_FILE" ]]; then
  echo "OK: all infra environment variables from $TEMPLATE are set in $ENV_FILE"
else
  echo "OK: all infra environment variables from $TEMPLATE are set"
fi
