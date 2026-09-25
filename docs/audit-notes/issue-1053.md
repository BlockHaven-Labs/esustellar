# Issue #1053: no CI validates infra manifests

**File audited:** `.github/workflows/`

## Finding
Existing workflows (`contracts-ci.yml`, `web-ci.yml`, `mobile-e2e.yml`,
`e2e-web.yml`, `accessibility.yml`) all cover application code. None
validates the hand-written YAML under `infra/k8s/`, `k8s/`,
`environments/testnet/k8s/`, `infra/monitoring/`, or runs
`terraform validate` / `terraform fmt -check` across the Terraform
roots.

## Recommendation
Add `.github/workflows/infra-ci.yml` running, per PR touching those
paths: `kustomize build` + schema validation for every k8s tree, and
`terraform fmt -check` / `terraform validate` for every Terraform
root (see #1050 for the underlying validation script this would call).

## Follow-up
Author the actual workflow file in a dedicated follow-up PR so it can
be validated against the CI image before merging.
