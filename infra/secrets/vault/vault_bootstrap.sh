#!/usr/bin/env bash

# HashiCorp Vault Environment Bootstrapping Engine
# Configures storage backends, policies, and authorization paths for SoroTask.
# Reference: Issue #535

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}" # Expects root token during initial provisioning pass
POLICY_NAME="sorotask-application-core"
POLICY_FILE="$(dirname "${BASH_SOURCE[0]}")/sorotask-app-policy.hcl"

log_info()    { echo -e "\033[0;34m[VAULT-INIT]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error()   { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

if [[ -z "$VAULT_TOKEN" ]]; then
    log_error "VAULT_TOKEN environment variable is unassigned. Run: export VAULT_TOKEN='your-root-token'"
    exit 1
fi

export VAULT_ADDR

log_info "Validating configuration connection paths for Vault at $VAULT_ADDR..."
if ! vault status >/dev/null 2>&1; then
    log_error "Cannot communicate with Vault engine instances. Ensure target container server is live."
    exit 1
fi

# 1. Enable Key-Value Version 2 Engine if missing
log_info "Enabling mount paths for KV Version 2 engine space..."
if ! vault secrets list | grep -q "^secret/"; then
    vault secrets enable -path=secret kv-v2
    log_success "KV-v2 engine mounted at secret/"
else
    log_info "KV-v2 engine already established at secret/ path."
fi

# 2. Register Application Policy Profile
log_info "Compiling and injecting path parameters inside $POLICY_FILE..."
vault policy write "$POLICY_NAME" "$POLICY_FILE"

# 3. Issue a scoped token for app startup pipelines
log_info "Generating safe application worker access tokens..."
APP_TOKEN=$(vault token create -policy="$POLICY_NAME" -ttl="720h" -format=json | jq -r '.auth.client_token')

log_success "Vault provisioning complete!"
echo "--------------------------------------------------------"
echo "ASSIGNED APPLICATION TOKEN: $APP_TOKEN"
echo "--------------------------------------------------------"