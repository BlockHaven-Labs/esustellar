# Issue #1266: stray JavaScript comment in CONTRIBUTING-INFRA.md

**File audited:** `CONTRIBUTING-INFRA.md`

## Finding
The line `// const [loading, setLoading] = useState(true);` is no longer
present. The "Branch Protection" section contains only the required
checks, review count and force-push rules, followed by the cross-reference
to `docs/branch-protection.md`.

## Guidance
No further change needed. A quick `grep -n "useState" CONTRIBUTING-INFRA.md`
should return nothing.
