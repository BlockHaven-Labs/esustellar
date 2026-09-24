# Issue #1049: smoke-test.sh CI wiring check

**File audited:** `infra/scripts/smoke-test.sh`,
`.github/workflows/*.yml`

## Finding
Searched all workflow files under `.github/workflows/` for an
invocation of `infra/scripts/smoke-test.sh`. No workflow currently
calls it — the smoke test exists but is not wired into any deploy
pipeline as a safety net.

## Recommendation
Add a post-deploy step in the relevant deploy workflow that runs
`infra/scripts/smoke-test.sh`, with a failure triggering
`infra/scripts/rollback/rollback.sh` automatically.

## Follow-up
Wire this in a focused follow-up PR once the target deploy workflow is
confirmed with the infra owners.
