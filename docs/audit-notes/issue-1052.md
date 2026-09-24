# Issue #1052: infracost.yml missing-key behavior

**File audited:** `.github/workflows/infracost.yml`,
`CONTRIBUTING-INFRA.md`

## Finding
`CONTRIBUTING-INFRA.md`'s "Required status checks" section lists only
Docker CI and the E2E Status Gate — Infracost is not mentioned, which
implies it is advisory, not blocking.

## Decision
Document explicitly: Infracost is an **advisory** check. If
`INFRACOST_API_KEY` is unset or revoked, the job should fail
gracefully (skip cost annotation) rather than block the PR, and this
should be encoded via `continue-on-error: true` on the Infracost step.

## Follow-up
Apply the `continue-on-error` flag and a short note in
`CONTRIBUTING-INFRA.md` in a focused follow-up diff.
