#!/usr/bin/env bash
# Validates every infra/k8s overlay by building it with kustomize and
# checking the output against the Kubernetes schema with kubeconform.
# Intended to be wired into CI once tool availability is confirmed.
set -euo pipefail

OVERLAY_ROOT="infra/k8s/overlays"

if ! command -v kustomize >/dev/null 2>&1; then
  echo "kustomize not found on PATH" >&2
  exit 1
fi
if ! command -v kubeconform >/dev/null 2>&1; then
  echo "kubeconform not found on PATH" >&2
  exit 1
fi

status=0
for overlay in "$OVERLAY_ROOT"/*/; do
  env_name="$(basename "$overlay")"
  echo "Validating overlay: $env_name"
  rendered="$(kustomize build "$overlay")"
  if ! printf '%s\n' "$rendered" | kubeconform -strict -summary; then
    echo "FAIL: $env_name failed manifest validation" >&2
    status=1
  fi

  # #1291: app.kubernetes.io/version is set in base/kustomization.yaml and
  # overridden in each overlay. It must match that overlay's image tag, or a
  # `kubectl get pods -l app.kubernetes.io/version=...` query reports the wrong
  # version after a rollout.
  version_line="$(printf '%s\n' "$rendered" | grep -m1 'app.kubernetes.io/version:' || true)"
  image_line="$(printf '%s\n' "$rendered" | grep -m1 'image: ghcr.io/blockhaven-labs/esustellar-web:' || true)"
  version_label="${version_line##*version: }"
  version_label="${version_label//\"/}"
  image_tag="${image_line##*:}"
  if [ -z "$version_label" ] || [ -z "$image_tag" ]; then
    echo "FAIL: $env_name is missing app.kubernetes.io/version or a versioned web image" >&2
    status=1
  elif [ "$version_label" != "$image_tag" ]; then
    echo "FAIL: $env_name version label '$version_label' does not match image tag '$image_tag'" >&2
    status=1
  fi
done

exit "$status"
