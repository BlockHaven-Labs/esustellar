# Issue #1066: runbook duplication check

**Files audited:** `docs/runbooks/`, `infra/docs/runbooks/`

## Finding
`infra/docs/runbooks/high-balance-alert.md` exists. `docs/runbooks/`
was checked and does **not** contain a `high-balance-alert.md` copy —
it only contains `deployer-keypair-rotation.md`, which covers a
different topic entirely.

## Decision
There is no actual duplicate of `high-balance-alert.md` today, so no
merge is required for that file. The two runbook directories
(`docs/runbooks/`, `infra/docs/runbooks/`) should still be
consolidated to one location going forward to prevent this from
becoming a real duplication later.

## Follow-up
Track directory consolidation separately; this note closes the
immediate "is there content to lose" concern.
