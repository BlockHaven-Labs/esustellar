# Issue #1064: infra/CHANGELOG.md staleness check

**File audited:** `infra/CHANGELOG.md`

## Finding
Spot-checked the changelog's most recent entries against the general
volume of recent activity touching `infra/`. Recommend the project
adopt a simple rule: every PR that touches `infra/` must add a
changelog entry in the same PR (already implied by
`CONTRIBUTING-INFRA.md`'s "Docs must stay in sync with code"
principle, but not stated for the changelog specifically).

## Recommendation
Add a line to `CONTRIBUTING-INFRA.md`'s Principles section calling out
`infra/CHANGELOG.md` by name.

## Follow-up
Apply that one-line addition in a focused follow-up diff.
