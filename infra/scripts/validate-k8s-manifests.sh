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
  if ! kustomize build "$overlay" | kubeconform -strict -summary; then
    echo "FAIL: $env_name failed manifest validation" >&2
    status=1
  fi
done

exit "$status"
