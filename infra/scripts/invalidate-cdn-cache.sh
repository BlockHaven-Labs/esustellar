#!/usr/bin/env bash
# Invalidate the CloudFront cache after a Kubernetes rollout.
#
# Why this step exists (#1113)
# ---------------------------
# The CDN distribution caches assets with default_ttl 3600 and max_ttl 86400
# (infra/terraform/modules/cdn/main.tf). A deploy ships new content-hashed asset
# filenames but does not change the URLs of already-cached paths, so copies of
# the *previous* build's assets stay reachable at the edge — for up to 24h on any
# path a browser, a CDN-cached HTML document, or a third party links to directly.
# The result is a mixed build in production: new HTML referencing hashed assets
# that some edge locations still serve from cache, or vice versa.
#
# The CI/CD role already holds cloudfront:CreateInvalidation, scoped to this
# project's distribution (see infra/terraform/modules/iam/main.tf, #992), so no
# IAM change is needed to call this.
#
# When to run it
# --------------
# AFTER the new ReplicaSet is fully rolled out and healthy — not before.
# Invalidating before the rollout finishes makes edge locations refetch from pods
# that are still serving the old build, which caches the old assets again.
# Verify readiness first: kubectl rollout status must be complete.
#
# Usage:
#   bash infra/scripts/invalidate-cdn-cache.sh [--distribution-id ID | --distribution-domain NAME]
#                                               [--paths '/path/*' ...] [--dry-run] [--wait]
#
#   --distribution-id       distribution id (E1XXXX...). Preferred.
#   --distribution-domain   xxxxx.cloudfront.net. Either form works with the CLI.
#   --paths                 paths to invalidate (default: '/*', i.e. everything)
#   --dry-run               print the command and exit
#   --wait                  block until CloudFront reports the invalidation complete
#   -h, --help              show help
#
# Distribution id resolution order: --distribution-id, --distribution-domain,
# CLOUDFRONT_DISTRIBUTION_ID env var, `terraform output` from infra/terraform.
#
# Invalidation cost: the first 1000 paths per month are free; beyond that AWS
# charges per invalidation path. A single '/*' invalidation is one path, so this
# is far cheaper than the staleness it prevents. Do not loop over individual
# asset paths.
#
# Exit codes: 0 ok, 1 invalidation failed, 2 usage/configuration error.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
TERRAFORM_DIR="$ROOT_DIR/infra/terraform"

DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
DISTRIBUTION_DOMAIN=""
PATHS=("/*")
DRY_RUN=0
WAIT=0

usage() {
  sed -n '/^# Usage:/,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;$d'
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --distribution-id) DISTRIBUTION_ID="${2:?--distribution-id requires a value}"; shift 2 ;;
    --distribution-domain) DISTRIBUTION_DOMAIN="${2:?--distribution-domain requires a value}"; shift 2 ;;
    --paths) PATHS=("${2:?--paths requires a value}"); shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --wait) WAIT=1; shift ;;
    -h|--help) usage ;;
    *) echo "invalidate-cdn-cache.sh: unknown argument '$1'" >&2; usage ;;
  esac
done

command -v aws >/dev/null 2>&1 || {
  echo "invalidate-cdn-cache.sh: aws CLI not found" >&2
  exit 2
}

if [ -z "$DISTRIBUTION_ID" ] && [ -z "$DISTRIBUTION_DOMAIN" ]; then
  if command -v terraform >/dev/null 2>&1 && [ -d "$TERRAFORM_DIR" ]; then
    DISTRIBUTION_ID=$(terraform -chdir="$TERRAFORM_DIR" output -raw distribution_id 2>/dev/null || true)
    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "null" ]; then
      echo "[cdn] resolved distribution from Terraform state: $DISTRIBUTION_ID"
    else
      DISTRIBUTION_ID=""
    fi
  fi
fi

if [ -z "$DISTRIBUTION_ID" ] && [ -z "$DISTRIBUTION_DOMAIN" ]; then
  cat >&2 <<'EOF'
invalidate-cdn-cache.sh: could not determine which distribution to invalidate.
Pass --distribution-id (E1XXXX...) or --distribution-domain (xxxxx.cloudfront.net),
or set CLOUDFRONT_DISTRIBUTION_ID.

To read it from Terraform state:
  terraform -chdir=infra/terraform output -raw distribution_id

Note: distribution_id must be the cdn module's output, which is only present if
a root actually instantiates the module.
EOF
  exit 2
fi

if [ -n "$DISTRIBUTION_DOMAIN" ] && [ -z "$DISTRIBUTION_ID" ]; then
  DISTRIBUTION_ID="$DISTRIBUTION_DOMAIN"
fi

cmd=(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID")
for path in "${PATHS[@]}"; do
  cmd+=(--paths "$path")
done
if [ "$WAIT" -eq 1 ]; then
  cmd+=(--wait)
fi

echo "[cdn] invalidating: ${PATHS[*]}"
echo "[cdn] distribution:  $DISTRIBUTION_ID"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[cdn] DRY-RUN: would run: ${cmd[*]}"
  exit 0
fi

# Rollout gate (#1113): invalidating mid-rollout re-caches the old build.
if command -v kubectl >/dev/null 2>&1; then
  namespace="${K8S_NAMESPACE:-esustellar}"
  if kubectl -n "$namespace" get deployment esustellar-web >/dev/null 2>&1; then
    echo "[cdn] waiting for the esustellar-web rollout in namespace '$namespace' to complete..."
    if ! kubectl -n "$namespace" rollout status deployment/esustellar-web --timeout=10m; then
      echo "[cdn] rollout did not complete; not invalidating (the edge would re-cache the old build)." >&2
      exit 1
    fi
  else
    echo "[cdn] no esustellar-web deployment in namespace '$namespace'; skipping rollout gate."
  fi
else
  echo "[cdn] kubectl not available; skipping rollout gate. Confirm the rollout completed manually."
fi

"${cmd[@]}"

echo "[cdn] done. If assets still look stale, check that no cached HTML document"
echo "[cdn] references the previous build, and remember max_ttl is 86400 (24h)."