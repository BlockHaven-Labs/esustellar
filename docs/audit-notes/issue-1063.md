# Issue #1063: CONTRIBUTING-INFRA.md scope gap

**File audited:** `CONTRIBUTING-INFRA.md`

## Finding
The "Scope" section lists `infra/`, `.github/workflows/`, and `docs/`
but omits the top-level `k8s/`, `monitoring/`, and `environments/`
directories, which are equally infra-relevant per the duplication
issues found across this audit batch.

## Decision
Fold `k8s/`, `monitoring/`, and `environments/` into the documented
scope explicitly rather than leaving their governance ambiguous.

## Follow-up
Apply the scope-list addition in a focused follow-up diff to
`CONTRIBUTING-INFRA.md`.
