# Issue #1273: dual manifest-tree incident runbook

**File audited:** `docs/runbooks/dual-manifest-tree-incident.md`

## Finding
The runbook requested here already exists. It covers the scenario where
resources from both `infra/k8s/` and top-level `k8s/` were applied to the
same cluster, with diagnosis steps comparing live labels against
`kustomize build infra/k8s/overlays/<env>` and the flat `k8s/` manifests.

## Guidance
Link it from `docs/incident-response.md` so on-call engineers can find it,
and retire it once the legacy `k8s/` tree is deleted.
