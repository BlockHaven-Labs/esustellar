#!/usr/bin/env bash
# Rolls back an EsuStellar release: the frontend contract IDs and, optionally,
# the Terraform-provisioned infrastructure.
#
# ── Scope: what this script covers and what it does not ──────────────────────
#
# A bad deploy can break two independent layers, and they roll back differently:
#
#   APPLICATION LAYER — WASM contracts + the frontend env vars that point at
#   them. Handled here by restoring the contract IDs from the deployment
#   snapshot, then redeploying the frontend.
#
#   INFRASTRUCTURE LAYER — anything Terraform manages: the VPC, subnets, IAM
#   roles, the ACM certificate, Route53 records, the CloudFront distribution,
#   S3 buckets. Terraform holds the real desired state; reverting it means
#   re-applying a previous configuration, NOT undoing individual AWS API calls.
#
# This script covers the infrastructure layer only for changes recorded in a
# Terraform plan backup (--target terraform). It explicitly does NOT cover:
#   - manual `aws` CLI changes made outside Terraform (they are invisible to
#     terraform state; use `terraform import` or a targeted manual revert)
#   - drift detected by `terraform-drift.yml` that predates the current release
#   - data-plane changes inside managed resources (objects in S3, rows in the
#     indexer database, CloudFront cache contents)
#   - out-of-band DNS or certificate changes at the registrar/CA
#
# If you are unsure which layer broke, roll back the application first
# (--target app): it is fast, reversible and does not touch AWS. Only reach for
# --target terraform when the infrastructure change itself is the cause.
#
# ── Terraform rollback mechanism ─────────────────────────────────────────────
#
# Terraform cannot "undo" an apply that did not save its plan, so the safe
# mechanism is a saved plan file:
#
#   Before applying:  terraform plan -out=rollback.tfplan
#                     cp rollback.tfplan "$PLAN_BACKUP_DIR/$ENVIRONMENT/$TS.tfplan"
#
# PLAN_BACKUP_DIR defaults to <repo>/.terraform-backups/plans and can be
# overridden with the environment variable of the same name. Save one per
# environment with a UTC timestamp suffix; this script picks the newest by mtime
# unless --plan names a specific file.
#
# The backups are written by the deploy runbook and are intentionally kept out
# of git. On rollback this script applies the most recent saved plan for the
# target environment. Applying a saved plan is exact — it replays the reviewed
# configuration, including its provider locks.
#
# ── Usage ───────────────────────────────────────────────────────────────────
#
#   bash infra/scripts/rollback/rollback.sh --network <testnet|staging|mainnet> \
#        --target <app|terraform|all> [--dry-run] [--plan FILE] [--yes]
#
#   --network    target environment (required; there is no safe default here,
#                which is why this script differs from its earlier version)
#   --target     app       restore frontend contract IDs (default)
#                terraform apply a saved plan from the plan backup directory
#                all       app, then terraform
#   --dry-run    print what would happen and exit 0 without changing anything
#   --plan FILE  use this specific saved plan instead of the newest backup
#   --yes        skip the interactive confirmation prompt
#
# Exit codes: 0 ok, 1 rollback failed, 2 usage/configuration error.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
SNAPSHOT_FILE="$ROOT_DIR/deployment-info.json"
ENV_FILE="$ROOT_DIR/apps/web/.env.local"

NETWORK=""
TARGET="app"
DRY_RUN=0
ASSUME_YES=0
PLAN_FILE=""
PLAN_BACKUP_DIR="${PLAN_BACKUP_DIR:-$ROOT_DIR/.terraform-backups/plans}"

usage() {
  sed -n '/^# ── Usage/,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;$d'
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --network) NETWORK="${2:?--network requires a value}"; shift 2 ;;
    --target) TARGET="${2:?--target requires a value}"; shift 2 ;;
    --plan) PLAN_FILE="${2:?--plan requires a value}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) usage ;;
    *) echo "rollback.sh: unknown argument '$1'" >&2; usage ;;
  esac
done

case "$NETWORK" in
  testnet|staging|mainnet) ;;
  *)
    echo "ERROR: --network must be one of: testnet, staging, mainnet." >&2
    echo "       There is deliberately no default; rolling back the wrong environment" >&2
    echo "       is not recoverable by re-running this script." >&2
    exit 2
    ;;
esac

case "$TARGET" in
  app|terraform|all) ;;
  *) echo "ERROR: --target must be one of: app, terraform, all." >&2; exit 2 ;;
esac

log() { echo "[rollback] $*"; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log "DRY-RUN: would run: $*"
    return 0
  fi
  log "running: $*"
  "$@"
}

# ── Application layer ────────────────────────────────────────────────────────

rollback_app() {
  if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo "ERROR: deployment-info.json not found. Cannot determine previous state." >&2
    return 1
  fi

  local prev_registry_id prev_savings_id
  prev_registry_id=$(jq -r '.registry_contract_id' "$SNAPSHOT_FILE")
  prev_savings_id=$(jq -r '.savings_contract_id' "$SNAPSHOT_FILE")

  if [ -z "$prev_registry_id" ] || [ -z "$prev_savings_id" ]; then
    echo "ERROR: Could not read contract IDs from deployment-info.json." >&2
    return 1
  fi

  log "Rolling application back to:"
  log "  Registry: $prev_registry_id"
  log "  Savings:  $prev_savings_id"
  log "  Network:  $NETWORK"

  if [ "$DRY_RUN" -eq 1 ]; then
    log "DRY-RUN: would rewrite $ENV_FILE with the contract IDs above"
    return 0
  fi

  if [ -f "$ENV_FILE" ]; then
    sed -i.bak \
      -e "s|^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=.*|NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$prev_registry_id|" \
      -e "s|^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=.*|NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$prev_savings_id|" \
      -e "s|^NEXT_PUBLIC_CONTRACT_ID=.*|NEXT_PUBLIC_CONTRACT_ID=$prev_savings_id|" \
      "$ENV_FILE"
    log "Restored $ENV_FILE (previous contents in $ENV_FILE.bak)."
  else
    {
      echo "NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$prev_registry_id"
      echo "NEXT_PUBLIC_SAVINGS_CONTRACT_ID=$prev_savings_id"
      echo "NEXT_PUBLIC_CONTRACT_ID=$prev_savings_id"
    } > "$ENV_FILE"
    log "Created $ENV_FILE."
  fi

  log "Application rollback staged. Redeploy the frontend to apply the restored contract IDs."
}

# ── Infrastructure layer ─────────────────────────────────────────────────────

resolve_plan_file() {
  if [ -n "$PLAN_FILE" ]; then
    if [ ! -f "$PLAN_FILE" ]; then
      echo "ERROR: --plan file '$PLAN_FILE' does not exist." >&2
      return 1
    fi
    printf '%s\n' "$PLAN_FILE"
    return 0
  fi

  local newest
  newest=$(ls -1t "$PLAN_BACKUP_DIR/$NETWORK"/*.tfplan 2>/dev/null | head -n 1 || true)
  if [ -z "$newest" ]; then
    echo "ERROR: no saved plan found for '$NETWORK' in $PLAN_BACKUP_DIR/$NETWORK." >&2
    echo "       A Terraform apply cannot be reversed without the plan that produced it." >&2
    echo "       Either pass --plan FILE, or recover the previous configuration from git:" >&2
    echo "         git log --oneline -- infra/terraform" >&2
    echo "         # then, from the previous commit's terraform dir:" >&2
    echo "         terraform plan -out=revert.tfplan && terraform apply revert.tfplan" >&2
    return 1
  fi
  printf '%s\n' "$newest"
}

rollback_terraform() {
  local tf_dir="$ROOT_DIR/infra/terraform"
  if [ ! -d "$tf_dir" ]; then
    echo "ERROR: $tf_dir not found." >&2
    return 1
  fi

  local plan
  plan=$(resolve_plan_file) || return 1

  log "Terraform rollback target: $NETWORK"
  log "Saved plan: $plan"

  if [ "$DRY_RUN" -eq 1 ]; then
    log "DRY-RUN: would run: terraform -chdir=$tf_dir init -reconfigure && terraform -chdir=$tf_dir apply -lock-timeout=10m $plan"
    return 0
  fi

  if [ "$ASSUME_YES" -eq 0 ]; then
    echo ""
    echo "About to apply a previously-saved Terraform plan to the '$NETWORK' environment."
    echo "Resources outside Terraform (manual aws calls, S3 objects, database rows) are NOT reverted."
    printf "Type the environment name to continue: "
    local confirmation
    read -r confirmation
    if [ "$confirmation" != "$NETWORK" ]; then
      echo "Aborted: '$confirmation' did not match '$NETWORK'." >&2
      return 1
    fi
  fi

  run terraform -chdir="$tf_dir" init -reconfigure -input=false
  run terraform -chdir="$tf_dir" apply -input=false -lock-timeout=10m "$plan"

  log "Terraform rollback applied."
  log "Reminder: a database rollback is NOT part of this. See infra/backups/README.md"
  log "           for restoring the indexer Postgres database from a backup."
}

# ── Orchestration ────────────────────────────────────────────────────────────

log "target=$TARGET network=$NETWORK dry_run=$DRY_RUN"

case "$TARGET" in
  app)
    rollback_app
    ;;
  terraform)
    rollback_terraform
    ;;
  all)
    # Application first: it is cheap and reversible, and it restores service
    # before spending time on a Terraform apply that may itself fail.
    rollback_app
    echo ""
    rollback_terraform
    ;;
esac

if [ "$DRY_RUN" -eq 1 ]; then
  log "dry run complete; nothing was changed."
fi

log "done."