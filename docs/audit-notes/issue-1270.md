# Issue #1270: infra/CHANGELOG.md freshness

**File audited:** `infra/CHANGELOG.md`

## Finding
The newest entry is `[0.3.0] - 2026-09-24`, and the file was last modified
that day. Since then more than 30 commits have touched `infra/` (k8s
workload hardening, CDN/DNS/SSL, ops scripts, CODEOWNERS), none of which
are recorded. The changelog is stale, which conflicts with the "docs must
stay in sync" principle in `CONTRIBUTING-INFRA.md`.

## Follow-up
Add a `[0.4.0]` entry covering the changes merged since 2026-09-24, and
require a changelog line in every PR that touches `infra/`.
