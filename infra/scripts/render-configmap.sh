#!/usr/bin/env bash
# #1290/#1289: render a ConfigMap template with real contract IDs. Never apply
# k8s/config/{mainnet,staging}-configmap.yaml directly — they contain ${...}
# placeholders that validate-configmaps.* deliberately rejects.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <template.yaml> <rendered.yaml>" >&2
  echo "Example: NEXT_PUBLIC_SAVINGS_CONTRACT_ID=C... $0 k8s/config/mainnet-configmap.yaml /tmp/mainnet-cm.yaml" >&2
  exit 2
fi

template="$1"
output="$2"
vars=(
  NEXT_PUBLIC_SAVINGS_CONTRACT_ID
  NEXT_PUBLIC_REGISTRY_CONTRACT_ID
  NEXT_PUBLIC_CONTRACT_ID
)

if [ ! -f "$template" ]; then
  echo "Template not found: $template" >&2
  exit 2
fi
if ! command -v envsubst >/dev/null 2>&1; then
  echo "envsubst (gettext) is required" >&2
  exit 2
fi

for var in "${vars[@]}"; do
  value="${!var:-}"
  if [ -z "$value" ] || [[ "$value" == *'${'* ]]; then
    echo "Missing or placeholder value for $var" >&2
    exit 2
  fi
done

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT
envsubst "$(printf '${%s} ' "${vars[@]}")" < "$template" > "$rendered"

if grep -q '\${' "$rendered"; then
  echo "Rendered ConfigMap still contains placeholders; refusing to write output" >&2
  exit 1
fi
cp "$rendered" "$output"

echo "Rendered $template -> $output" >&2
echo "Verify with: python3 infra/scripts/validate-configmaps.py $(dirname "$output")" >&2
