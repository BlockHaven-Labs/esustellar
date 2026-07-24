#!/usr/bin/env bash

# SoroTask Git Verification Environment Bootstrapper
# Sets up and configures client-side pre-commit security boundaries.
# Reference: Issue #536

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_FILE="$WORKSPACE_ROOT/.secrets.baseline"

log_info()    { echo -e "\033[0;34m[HOOKS-INIT]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error()   { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

cd "$WORKSPACE_ROOT"

# 1. Verify framework prerequisites
if ! command -v pre-commit &> /dev/null; then
    log_error "pre-commit binary manager not found. Please install it: 'brew install pre-commit' or 'pip install pre-commit'"
    exit 1
fi

if ! command -v detect-secrets &> /dev/null; then
    log_info "Installing Yelp/detect-secrets base scanning engine via pip..."
    pip install detect-secrets
fi

# 2. Build or update the cryptographic signature baseline
if [ ! -f "$BASELINE_FILE" ]; then
    log_info "Generating initial security signature baseline map at $BASELINE_FILE..."
    detect-secrets scan --exclude-files 'Cargo.lock|package-lock.json' > "$BASELINE_FILE"
    log_success "Baseline metadata file generated."
else
    log_info "Baseline exists. Syncing historical context states..."
    detect-secrets scan --baseline "$BASELINE_FILE" --exclude-files 'Cargo.lock|package-lock.json' > "${BASELINE_FILE}.tmp"
    mv "${BASELINE_FILE}.tmp" "$BASELINE_FILE"
fi

# 3. Bind active script rules onto Git metadata parameters
log_info "Binding configuration parameters inside local git workspace channels..."
pre-commit install

log_success "Pre-commit security hooks are fully initialized and active!"