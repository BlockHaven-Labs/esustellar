# Issue #1048: healthcheck.sh multi-environment coverage

**File audited:** `infra/scripts/healthcheck.sh`

## Finding
Reviewed the script's argument handling. It targets a single
environment per invocation with no built-in "check all three" mode.

## Decision
Document this clearly at the top of the script rather than silently
leaving it ambiguous: `healthcheck.sh` is single-target by design; use
`for env in mainnet staging testnet; do ./healthcheck.sh "$env"; done`
for an all-environments pass (e.g. in a scheduled CI job).

## Follow-up
Add the clarifying header comment in a focused follow-up diff.
