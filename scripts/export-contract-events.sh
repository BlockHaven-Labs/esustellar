#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_JS="$SCRIPT_DIR/export-contract-events.js"

# Convert WSL / POSIX path to Windows path if using node.exe on Windows
if command -v wslpath >/dev/null 2>&1; then
  TARGET_JS="$(wslpath -w "$TARGET_JS")"
elif command -v cygpath >/dev/null 2>&1; then
  TARGET_JS="$(cygpath -w "$TARGET_JS")"
fi

NODE_CMD=""
if command -v node >/dev/null 2>&1; then
  NODE_CMD="node"
elif command -v node.exe >/dev/null 2>&1; then
  NODE_CMD="node.exe"
fi

if [ -n "$NODE_CMD" ]; then
  "$NODE_CMD" "$TARGET_JS" "$@"
else
  echo "❌ Node.js executable not found. Please install Node.js."
  exit 1
fi
