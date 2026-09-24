# Issue #1056: no Terraform security-policy scanning

**File audited:** `.github/workflows/`

## Finding
Confirmed no workflow runs `tflint`, `checkov`, or `tfsec` against the
Terraform modules, despite known security-sensitive patterns (e.g.
overly-broad `resources = ["*"]` IAM statements flagged elsewhere in
this audit).

## Recommendation
Add a required CI check running `tfsec` (or `checkov`/`trivy config`)
against `infra/terraform/modules/**` so wildcard-resource IAM policies
and similar issues are caught automatically rather than only via
manual audit.

## Follow-up
Author the scanning job in a dedicated follow-up PR alongside #1055,
since both likely belong in the same `terraform-ci.yml` workflow.
