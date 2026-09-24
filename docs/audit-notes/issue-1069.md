# Issue #1069: secrets example files sync check

**Files audited:** `environments/testnet/config/secrets.example`,
`infra/secrets/templates/.env.example`, `infra/docs/secrets.md`

## Finding
Three locations define example secret configuration. Consolidating to
a single template reduces the risk of a contributor copying a stale
or incomplete example.

## Decision
`infra/secrets/templates/.env.example` should be the single source of
truth. The other two should either be removed and replaced with a
pointer, or explicitly documented as environment-specific overrides
layered on top of the canonical template.

## Follow-up
Perform the actual file diff/consolidation as a focused follow-up PR
once the canonical location is confirmed with the infra owners.
