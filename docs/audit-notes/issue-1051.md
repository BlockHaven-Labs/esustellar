# Issue #1051: infracost.yml path filter gap

**File audited:** `.github/workflows/infracost.yml`

## Finding
The `on.pull_request.paths` filter is scoped to `infra/terraform/**`
only, so changes under `infra/testnet/`, `environments/staging/`, or
`environments/testnet/` (the other three Terraform roots) produce no
cost estimate at all.

## Recommendation
Broaden the paths filter to:
```
paths:
  - 'infra/terraform/**'
  - 'infra/testnet/**'
  - 'environments/staging/**'
  - 'environments/testnet/**'
```

## Follow-up
Apply the filter change in a focused follow-up diff once the
Infracost job's working-directory matrix is confirmed to handle all
four roots.
