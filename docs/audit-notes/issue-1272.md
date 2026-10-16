# Issue #1272: high-balance-alert runbook merge

**Files audited:** `docs/runbooks/`, `infra/docs/`

## Finding
Only one copy of `high-balance-alert.md` exists in the repo, at
`docs/runbooks/high-balance-alert.md`. `infra/docs/` no longer has a
`runbooks/` folder, so the duplicate has already been consolidated and
there is no second copy whose unique content could be lost.

## Guidance
If a second copy is ever reintroduced, diff both and merge the unique
steps into `docs/runbooks/` before deleting the other.
