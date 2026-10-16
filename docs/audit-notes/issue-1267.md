# Issue #1267: stray trailing commas in CONTRIBUTING-INFRA.md

**File audited:** `CONTRIBUTING-INFRA.md`

## Finding
Both reported spots are already clean: `- **Force pushes**: Disallowed`
and `## Principles` no longer end with a comma. A scan for lines ending
in `,` finds only a line break inside the CODEOWNERS paragraph's prose
list, which is legitimate.

## Guidance
No further change needed.
