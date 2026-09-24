# Issue #1062: branch protection doc duplication

**Files audited:** `CONTRIBUTING-INFRA.md`, `docs/branch-protection.md`

## Finding
`CONTRIBUTING-INFRA.md`'s Branch Protection section restates specific
rule values that `docs/branch-protection.md` already documents in
detail, per its own cross-reference.

## Decision
`docs/branch-protection.md` is the single source of truth for rule
values. `CONTRIBUTING-INFRA.md` should link to it and stop restating
specifics that can drift out of sync.

## Follow-up
Trim `CONTRIBUTING-INFRA.md`'s Branch Protection section down to a
one-line link in a focused follow-up diff.
