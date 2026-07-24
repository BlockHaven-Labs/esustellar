#!/usr/bin/env bash
# scripts/cleanup-artifacts.sh
#
# Removes:
#   - WASM files older than 30 days from the target/ directory
#   - Container image tags beyond the 10 most recent for each package in GHCR
#
# Usage:
#   ./scripts/cleanup-artifacts.sh [--dry-run]
#
# Requirements (container cleanup):
#   - gh CLI authenticated (gh auth login)
#   - GHCR_OWNER env var (defaults to git remote org/user)

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[dry-run] No files or images will be deleted."
fi

log()  { echo "[cleanup] $*"; }
warn() { echo "[cleanup] WARN: $*" >&2; }

# ── WASM cleanup ──────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_MAX_AGE_DAYS=30

log "Scanning for WASM files older than ${WASM_MAX_AGE_DAYS} days under ${REPO_ROOT}/target/ ..."

mapfile -t OLD_WASMS < <(
  find "${REPO_ROOT}/target" -name "*.wasm" -mtime "+${WASM_MAX_AGE_DAYS}" 2>/dev/null || true
)

if [[ ${#OLD_WASMS[@]} -eq 0 ]]; then
  log "No stale WASM files found."
else
  for f in "${OLD_WASMS[@]}"; do
    if $DRY_RUN; then
      log "[dry-run] Would delete: $f"
    else
      rm -f "$f"
      log "Deleted: $f"
    fi
  done
fi

# ── Container image cleanup ───────────────────────────────────────────────────

KEEP_TAGS=10

# Determine GHCR owner from env or git remote
if [[ -z "${GHCR_OWNER:-}" ]]; then
  GHCR_OWNER="$(git -C "${REPO_ROOT}" remote get-url origin 2>/dev/null \
    | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|' || true)"
fi

if [[ -z "${GHCR_OWNER:-}" ]]; then
  warn "Cannot determine GHCR_OWNER. Set the GHCR_OWNER environment variable."
  warn "Skipping container image cleanup."
  exit 0
fi

if ! command -v gh &>/dev/null; then
  warn "gh CLI not found. Skipping container image cleanup."
  exit 0
fi

log "Fetching container packages for owner '${GHCR_OWNER}' ..."

# List all container packages (may be empty for new orgs)
PACKAGES=$(gh api \
  --paginate \
  "/users/${GHCR_OWNER}/packages?package_type=container" \
  --jq '.[].name' 2>/dev/null || \
  gh api \
  --paginate \
  "/orgs/${GHCR_OWNER}/packages?package_type=container" \
  --jq '.[].name' 2>/dev/null || true)

if [[ -z "$PACKAGES" ]]; then
  log "No container packages found for '${GHCR_OWNER}'."
  exit 0
fi

while IFS= read -r pkg; do
  log "Processing package: ${pkg}"

  # Fetch all versions sorted by created_at descending
  VERSIONS=$(gh api \
    --paginate \
    "/users/${GHCR_OWNER}/packages/container/${pkg}/versions" \
    --jq 'sort_by(.created_at) | reverse | .[].id' 2>/dev/null || \
    gh api \
    --paginate \
    "/orgs/${GHCR_OWNER}/packages/container/${pkg}/versions" \
    --jq 'sort_by(.created_at) | reverse | .[].id' 2>/dev/null || true)

  if [[ -z "$VERSIONS" ]]; then
    log "  No versions found."
    continue
  fi

  mapfile -t VERSION_IDS <<< "$VERSIONS"
  TOTAL=${#VERSION_IDS[@]}
  log "  Found ${TOTAL} version(s); keeping ${KEEP_TAGS}."

  if [[ $TOTAL -le $KEEP_TAGS ]]; then
    log "  Nothing to delete."
    continue
  fi

  # Delete everything beyond the KEEP_TAGS most recent
  for id in "${VERSION_IDS[@]:${KEEP_TAGS}}"; do
    if $DRY_RUN; then
      log "  [dry-run] Would delete version id=${id}"
    else
      gh api --method DELETE \
        "/users/${GHCR_OWNER}/packages/container/${pkg}/versions/${id}" \
        2>/dev/null || \
        gh api --method DELETE \
        "/orgs/${GHCR_OWNER}/packages/container/${pkg}/versions/${id}" \
        2>/dev/null || \
        warn "  Failed to delete version id=${id} (may already be gone)"
      log "  Deleted version id=${id}"
    fi
  done
done <<< "$PACKAGES"

log "Cleanup complete."
