# Audit verification: Nested infra path, runbook location, secrets docs and canonical-source statement

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1438 — nested infra/infra path

- **Resolution:** No tracked file lives under `infra/infra/`.
- **Evidence:** `git ls-files | grep -c '^infra/infra'` returns 0 on this commit
- **Status:** Satisfied (already moved).

## #1439 — runbooks split across two directories

- **Resolution:** All runbooks live in `docs/runbooks/`.
- **Evidence:** `docs/runbooks/` contains `deployer-keypair-rotation.md`, `dual-manifest-tree-incident.md`, `high-balance-alert.md`, `regional-outage-dr.md`; no `infra/docs/runbooks/` directory is tracked
- **Status:** Satisfied.

## #1440 — secrets docs disagree on deployment architecture

- **Resolution:** Both documents state Kubernetes as the target, call Vercel optional, and name which document wins.
- **Evidence:** `infra/docs/secrets.md:1-25` (scope, 'if the two disagree, that document wins', Kubernetes target, Vercel not production), `infra/secrets/README.md:11-25` (deployment-target table, Vercel optional)
- **Status:** Satisfied.

## #1441 — README resolves the canonical tree for each concern

- **Resolution:** `infra/README.md` has a table of canonical versus deprecated trees.
- **Evidence:** `infra/README.md:44-62` (Canonical Sources of Truth, rule of thumb, 'canonical column wins'), `:82-92` (directory map with deprecated trees)
- **Status:** Satisfied.

