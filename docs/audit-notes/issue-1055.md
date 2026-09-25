# Issue #1055: no terraform fmt/validate CI job

**File audited:** `.github/workflows/`

## Finding
Confirmed no workflow currently runs `terraform fmt -check` or
`terraform validate` across `infra/terraform`, `infra/testnet`, or
`environments/*`.

## Recommendation
Add `.github/workflows/terraform-ci.yml` running `terraform fmt
-check` and `terraform validate` (via a matrix over the four Terraform
roots) on every PR touching those paths, ahead of Infracost/review.

## Follow-up
Author the workflow in a dedicated follow-up PR so it can be
validated against the CI image before merging.
