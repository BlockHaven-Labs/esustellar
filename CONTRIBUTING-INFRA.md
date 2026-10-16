# Contributing to Infrastructure (`infra/`, `.github/workflows/`, `docs/`)

This guide complements `CONTRIBUTING.md` and covers infra-specific contribution guidelines.

## Scope

The infra folder includes:
- `infra/` — deployment configs, Docker Compose, terraform/pulumi
- `.github/workflows/` — CI/CD pipelines
- `docs/` — architecture, deployment, runbooks, standards.
- `k8s/` — legacy flat manifests (canonical manifests are in `infra/k8s/`)
- `monitoring/` — legacy balance-exporter (canonical stack is `infra/monitoring/`)
- `environments/` — per-environment Terraform roots and deploy scripts

## Branch Protection

The `main` branch is protected. `docs/branch-protection.md` is the single source
of truth for the rules (required status checks, review count, force-push policy)
and their setup; they are not restated here so they cannot drift.

### Required reviewers by path (CODEOWNERS)

`.github/CODEOWNERS` narrows "at least 1 approval" to an owner with infra
context for every path that changes running infrastructure: `infra/`, `k8s/`,
`monitoring/`, `environments/`, `.github/workflows/`, `infracost.yml`,
`Dockerfile` and `docker-compose.yml`. CODEOWNERS only *requests* a review —
to enforce it, enable **Require review from Code Owners** on the `main` branch
protection rule (see `docs/branch-protection.md`).

When you touch any of those paths, expect an infra-knowledgeable reviewer to be
requested automatically; do not treat a generic "1 approval" as sufficient.

## Principles

1. **All infra changes must be reviewed** — no direct pushes to `main`
2. **Docs must stay in sync with code** — update docs in the same PR
3. **Secrets never committed** — use Docker secrets, env files, or GH secrets
4. **Test changes on testnet first** — never test directly on mainnet

## CI Workflow Changes

When editing `.github/workflows/*.yml`:
- Test workflow syntax: `act` locally or push to a branch
- Verify no hardcoded secrets or credentials
- Use `gha` cache mode for Docker layer caching

## Adding a New Doc

1. Create file under `docs/` following existing naming: `kebab-case.md`
2. Add a cross-reference in `infra/README.md`
3. Keep markdown linted: `npx markdownlint docs/<file>`

## Reviewing Infra PRs

Check for:
- ✅ No plaintext secrets
- ✅ Docker layer caching enabled
- ✅ Multi-arch build support
- ✅ Documentation updated
- ✅ Rollback procedure documented
