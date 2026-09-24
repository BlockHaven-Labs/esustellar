# Issue #1079: pre-commit coverage for infra file types

**File audited:** `.pre-commit-config.yaml`

## Finding
Reviewed the current hook list. Infra-relevant checks (`terraform
fmt`, a YAML linter for the k8s/monitoring manifests, and a
secret-scanning hook) are not all present alongside the
application-code hooks.

## Recommendation
Add these hooks:
- `terraform_fmt` (from `pre-commit-terraform`)
- `yamllint` scoped to `infra/`, `k8s/`, `environments/`
- `detect-secrets` or `gitleaks` repo-wide

## Follow-up
Wire the three hooks above in a focused follow-up PR to
`.pre-commit-config.yaml`.
