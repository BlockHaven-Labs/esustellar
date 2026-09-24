#!/usr/bin/env bash
# Validates that Kubernetes ConfigMaps have required contract IDs populated.
# Usage: validate-configmaps.sh [config-map-dir]
# Exit codes: 0 = all valid, 1 = validation failed

set -euo pipefail

CONFIG_DIR="${1:-k8s/config}"

# Required keys that must not be empty
REQUIRED_KEYS=(
  "NEXT_PUBLIC_SAVINGS_CONTRACT_ID"
  "NEXT_PUBLIC_REGISTRY_CONTRACT_ID"
  "NEXT_PUBLIC_CONTRACT_ID"
)

echo "Validating ConfigMaps in ${CONFIG_DIR}..."

failed=0

for config_file in "${CONFIG_DIR}"/*.yaml; do
  [ -f "${config_file}" ] || continue

  # Skip secret files
  if [[ "${config_file}" == *"secret"* ]]; then
    continue
  fi

  echo "Checking ${config_file}..."

  # Extract namespace from metadata
  namespace=$(yq -r '.metadata.namespace // "default"' "${config_file}" 2>/dev/null || echo "unknown")

  # Check each required key
  for key in "${REQUIRED_KEYS[@]}"; do
    value=$(yq -r ".data.${key}" "${config_file}" 2>/dev/null || echo "")
    
    if [[ -z "${value}" || "${value}" == "null" ]]; then
      echo "  ✗ FAIL: ${key} is empty in ${config_file} (namespace: ${namespace})"
      failed=1
    elif [[ "${value}" == *"MUST BE POPULATED"* ]]; then
      echo "  ✗ FAIL: ${key} contains template placeholder in ${config_file} (namespace: ${namespace})"
      failed=1
    else
      echo "  ✓ OK: ${key} = ${value}"
    fi
  done
done

if [[ ${failed} -eq 1 ]]; then
  echo ""
  echo "Validation FAILED: One or more ConfigMaps have empty or template contract IDs."
  echo "Ensure all required keys are populated with real contract IDs before deployment."
  exit 1
fi

echo ""
echo "All ConfigMaps validated successfully."
exit 0