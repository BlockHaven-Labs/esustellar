#!/bin/bash
set -euo pipefail

# Contract spec/ABI export script (#867)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SPECS_DIR="$ROOT_DIR/docs/contract-specs"
CHECK_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK_MODE=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

command -v stellar >/dev/null 2>&1 || { echo "Error: stellar CLI not found." >&2; exit 1; }
mkdir -p "$SPECS_DIR"

CONTRACTS=("savings" "registry")
WASM_NAMES=("esustellar_savings.wasm" "group_registry.wasm")

exported_any=false
stale=false

for i in "${!CONTRACTS[@]}"; do
  name="${CONTRACTS[$i]}"
  wasm_file="${WASM_NAMES[$i]}"
  full_wasm="$ROOT_DIR/target/wasm32v1-none/release/$wasm_file"
  spec_file="$SPECS_DIR/${name}-spec.json"

  if [ ! -f "$full_wasm" ]; then
    echo "Warning: WASM not found at $full_wasm. Building..." >&2
    (cd "$ROOT_DIR/contracts/$name" && stellar contract build)
  fi
  [ ! -f "$full_wasm" ] && { echo "Error: Could not build $name" >&2; exit 1; }

  echo "Exporting spec for $name..."
  spec_json=$(stellar contract inspect --wasm "$full_wasm" --output json 2>/dev/null || stellar contract inspect --wasm "$full_wasm" 2>/dev/null || echo '{}')

  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  output=$(printf '{"contract":"%s","version":"0.1.0","exported_at":"%s","wasm_file":"%s","spec":%s}' "$name" "$timestamp" "$wasm_file" "$spec_json")

  if [ "$CHECK_MODE" = true ]; then
    if [ -f "$spec_file" ]; then
      existing_no_ts=$(sed 's/"exported_at": "[^"]*"/"exported_at": "X"/g' "$spec_file")
      new_no_ts=$(echo "$output" | sed 's/"exported_at": "[^"]*"/"exported_at": "X"/g')
      if [ "$existing_no_ts" != "$new_no_ts" ]; then
        echo "Error: $name spec is STALE." >&2; stale=true
      else
        echo "  OK: $name spec is up to date."
      fi
    else
      echo "Error: $name spec file missing at $spec_file" >&2; stale=true
    fi
  else
    echo "$output" > "$spec_file"
    echo "  Written to $spec_file"
    exported_any=true
  fi
done

[ "$CHECK_MODE" = true ] && [ "$stale" = true ] && exit 1
[ "$CHECK_MODE" = false ] && [ "$exported_any" = true ] && echo "Contract specs exported to $SPECS_DIR/"