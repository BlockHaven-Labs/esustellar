#!/usr/bin/env bash
# set-image-tag.sh — Pin the esustellar-web image of a Kustomize overlay to an
# immutable tag or digest, or check that an overlay is already pinned.
#
# Usage:
#   ./infra/scripts/deploy/set-image-tag.sh <mainnet|staging|testnet> <tag-or-digest>
#   ./infra/scripts/deploy/set-image-tag.sh --check <mainnet|staging|testnet>
#
# <tag-or-digest> is a release version (1.4.2 or v1.4.2), a git commit SHA (7-40
# hex characters) or an image digest (sha256:<64 hex>). `latest` and the moving
# `<env>-latest` tags are rejected: they make a deploy depend on whatever was
# pushed last, so a rollback or an audit cannot say what was running (#1469).
#
# Without --check this edits infra/k8s/overlays/<env>/kustomization.yaml in the
# working tree with `kustomize edit set image`. Intended for the deploy job's
# ephemeral checkout; do not commit the result. With --check it renders the
# overlay and exits 1 if the web image is not pinned, so it can gate a deploy.
set -euo pipefail

IMAGE="ghcr.io/blockhaven-labs/esustellar-web"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

usage() {
  sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

check_only=0
if [ "${1:-}" = "--check" ]; then
  check_only=1
  shift
fi

ENV_NAME="${1:-}"
case "$ENV_NAME" in
  mainnet|staging|testnet) ;;
  *) usage ;;
esac
OVERLAY="$ROOT/infra/k8s/overlays/$ENV_NAME"
[ -d "$OVERLAY" ] || { echo "❌ Overlay not found: $OVERLAY" >&2; exit 1; }

is_moving() {
  case "$1" in
    latest|*-latest) return 0 ;;
    *) return 1 ;;
  esac
}

if [ "$check_only" = "1" ]; then
  command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not found" >&2; exit 1; }
  rendered_image="$(kubectl kustomize "$OVERLAY" | grep -Eo "image: ${IMAGE}[^[:space:]]*" | head -n1 | sed 's/^image: //')"
  [ -n "$rendered_image" ] || { echo "❌ No $IMAGE image found in the rendered $ENV_NAME overlay" >&2; exit 1; }
  ref="${rendered_image#"$IMAGE"}"
  case "$ref" in
    @sha256:*) echo "✅ $ENV_NAME is pinned to a digest: $rendered_image"; exit 0 ;;
    :*) tag="${ref#:}" ;;
    *) echo "❌ $ENV_NAME image has no tag or digest: $rendered_image" >&2; exit 1 ;;
  esac
  if is_moving "$tag"; then
    echo "❌ $ENV_NAME image uses the moving tag '$tag' ($rendered_image). Pin it with set-image-tag.sh $ENV_NAME <tag-or-digest>." >&2
    exit 1
  fi
  echo "✅ $ENV_NAME image is pinned: $rendered_image"
  exit 0
fi

REF="${2:-}"
[ -n "$REF" ] || usage
if is_moving "$REF"; then
  echo "❌ '$REF' is a moving tag. Use a release version, a git SHA or an image digest." >&2
  exit 1
fi

if [[ "$REF" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  target="${IMAGE}@${REF}"
elif [[ "$REF" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || [[ "$REF" =~ ^[0-9a-f]{7,40}$ ]]; then
  target="${IMAGE}:${REF}"
else
  echo "❌ '$REF' is not a release version (1.2.3 / v1.2.3), a git SHA (7-40 hex) or a sha256 digest." >&2
  exit 1
fi

command -v kustomize >/dev/null 2>&1 || { echo "❌ kustomize not found" >&2; exit 1; }
(cd "$OVERLAY" && kustomize edit set image "${IMAGE}=${target}")
echo "✅ $ENV_NAME overlay now deploys $target (working tree only; do not commit)."
