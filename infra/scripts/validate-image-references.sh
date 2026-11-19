#!/usr/bin/env bash
# #1288: every manifest that deploys the web app must name the same image
# repository. Tags are allowed to differ per environment; the repository may not.
set -euo pipefail

CANONICAL_REPO="ghcr.io/blockhaven-labs/esustellar-web"
status=0
checked=0

check_repo() {
  local entry="$1" kind="$2" repo="$3"
  checked=$((checked + 1))
  if [ "$repo" != "$CANONICAL_REPO" ]; then
    printf 'FAIL [%s] %s\n  found:      %s\n  expected:   %s\n' "$kind" "$entry" "$repo" "$CANONICAL_REPO" >&2
    status=1
  fi
}

image_refs="$(grep -R -n -E --include='*.yaml' 'image:[[:space:]]*[^[:space:]]*esustellar-web' k8s infra/k8s 2>/dev/null || true)"
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  image="$(printf '%s\n' "$entry" | sed -E 's/^[^:]*:[[:space:]]*image:[[:space:]]*([^[:space:]]+).*/\1/')"
  check_repo "$entry" "container image" "${image%:*}"
done <<< "$image_refs"

kustomize_refs="$(grep -R -n -E --include='kustomization.yaml' '^[[:space:]]*- name:[[:space:]]*[^[:space:]]*esustellar-web' infra/k8s/overlays 2>/dev/null || true)"
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  name="$(printf '%s\n' "$entry" | sed -E 's/^.*- name:[[:space:]]*([^[:space:]]+).*/\1/')"
  check_repo "$entry" "kustomize image name" "$name"
done <<< "$kustomize_refs"

if [ "$checked" -eq 0 ]; then
  echo "FAIL: no esustellar-web image references found" >&2
  exit 1
fi

if [ "$status" -ne 0 ]; then
  echo "" >&2
  echo "All web manifests must use $CANONICAL_REPO. Tags are environment-specific." >&2
  exit 1
fi

echo "OK: $checked web image references all use $CANONICAL_REPO"
