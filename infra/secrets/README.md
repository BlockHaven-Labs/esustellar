# Secrets Management Strategy

This is the **authoritative inventory** of every secret used by EsuStellar, and
the single source of truth when documents disagree.

Companion documents:

- [`infra/docs/secrets.md`](../docs/secrets.md) — operator checklist for the
  subset of secrets that **GitHub Actions** needs.
- [`infra/secrets/templates/.env.example`](templates/.env.example) — annotated
  template for **local development** values.

## EsuStellar deploys to more than one target

This is the point that previously made the docs look contradictory (#987): this
file described a Kubernetes + Sealed Secrets world while `infra/docs/secrets.md`
described a Vercel + GHCR world, sharing only two secret names. Both were
describing real parts of the same system. The full picture:

| Target | What runs there | Defined in |
|---|---|---|
| **Stellar / Soroban** | `savings` and `registry` contracts | `contracts/`, `deploy.sh` |
| **Vercel** | `apps/web` Next.js frontend | `scripts/generate-workflows.sh` → `deploy-vercel.yml` |
| **GHCR** | container images for the web app | `docs/deployment.md` |
| **Docker Compose** | self-hosted production host, testnet sandbox | `docs/deployment.md`, `environments/testnet/docker-compose.yml` |
| **AWS** | ECS Fargate, CloudFront, ECR, S3, KMS | `infra/terraform/`, `infra/testnet/` |
| **Kubernetes** | staging and mainnet workloads, monitoring stack | `infra/k8s/`, `environments/staging/`, `infra/monitoring/` |

So a secret's **target** determines where it is stored — there is no single
mechanism, and that is intentional.

## Storage mechanism by target

| Target | Mechanism |
|---|---|
| Local development | `.env` files (gitignored) |
| GitHub Actions | GitHub encrypted repository secrets |
| Vercel | Vercel project environment variables (plus CI secrets to authenticate the deploy) |
| AWS | SSM Parameter Store (see `infra/testnet/main.tf`), KMS-encrypted at rest |
| Kubernetes | Kubernetes `Secret` objects; **Sealed Secrets planned**, see below |
| Docker Compose | host `.env` file, not committed |

### Sealed Secrets status: planned, not active

`kubeseal` is the intended mechanism for committing encrypted Kubernetes secrets,
but **nothing uses it yet** — there are no `SealedSecret` manifests in the repo
and no workflow runs `kubeseal`. Until that lands, Kubernetes secrets are created
out-of-band (`kubectl create secret`) and never committed. Treat the `kubeseal`
recipe below as the target state.

## Secrets Inventory

**Status** is `Active` if committed code reads it, `Planned` if it is documented
for work that does not exist yet.

### Blockchain / RPC

| Secret | Target | Status | Description |
|---|---|---|---|
| `STELLAR_RPC_URL` | AWS, k8s, local | Active | Soroban RPC endpoint. Stored in SSM by `infra/testnet/main.tf` |
| `STELLAR_NETWORK_PASSPHRASE` | AWS, k8s, local | Active | `Test SDF Network ; September 2015` (testnet) or `Public Global Stellar Network ; September 2015` (mainnet) |
| `DEPLOYER_SECRET_KEY` | GitHub Actions | Active | Stellar account used for contract deployment. Rotate with `infra/scripts/rotate-deployer-keypair.sh` |

`STELLAR_RPC_URL` and `STELLAR_NETWORK_PASSPHRASE` are **configuration, not
credentials** — they are public endpoint values. They are listed here because
they are delivered through the same secret plumbing.

### Web application

| Secret | Target | Status | Description |
|---|---|---|---|
| `VERCEL_TOKEN` | GitHub Actions | Active | Authenticates the Vercel deploy |
| `VERCEL_ORG_ID` | GitHub Actions | Active | Vercel organisation / team ID |
| `VERCEL_PROJECT_ID` | GitHub Actions | Active | Vercel project ID |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | GitHub Actions, Vercel | Active | Build-time contract ID (public — `NEXT_PUBLIC_*` is exposed to the browser) |
| `NEXT_PUBLIC_SAVINGS_CONTRACT_ID` | GitHub Actions, Vercel | Active | Build-time contract ID (public) |
| `NEXTAUTH_SECRET` | k8s | Planned | Session encryption key — no auth implementation reads this yet |
| `DATABASE_URL` | k8s | Planned | Postgres connection string — no service reads this yet |

### Containers

| Secret | Target | Status | Description |
|---|---|---|---|
| `GHCR_USERNAME` | GitHub Actions, Compose | Planned | GHCR user for image push/pull |
| `GHCR_TOKEN` | GitHub Actions, Compose | Planned | PAT with `write:packages` / `read:packages`. No publishing workflow exists yet |

### Infrastructure

| Secret | Target | Status | Description |
|---|---|---|---|
| AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or an assumed role / OIDC) | AWS | Active | Required by `terraform apply`. Applied locally today — **not** configured in CI |
| `INFRACOST_API_KEY` | GitHub Actions | Active | Read by `.github/workflows/infracost.yml` |
| `KUBE_CONFIG` | GitHub Actions | Planned | Base64 kubeconfig for CI-driven `kubectl` — nothing applies manifests from CI yet |

### Monitoring

| Secret | Target | Status | Description |
|---|---|---|---|
| `GRAFANA_ADMIN_PASSWORD` | k8s | Active | Supplied via the `grafana-admin` Secret (key `password`), read as `GF_SECURITY_ADMIN_PASSWORD` in `infra/monitoring/grafana/grafana-deployment.yaml` |
| `ALERTMANAGER_SLACK_WEBHOOK_URL` | k8s | Planned | Alert routing webhook. `infra/monitoring/prometheus/alertmanager-config.yaml` currently **hardcodes a placeholder** `api_url` instead of reading a secret |
| `CODECOV_TOKEN` | GitHub Actions | Planned | Coverage upload — no workflow uploads coverage yet |

## Known naming inconsistencies

These names refer to the same value in different places. The **canonical** column
is what new code should use; the others are legacy spellings that should be
migrated.

| Canonical | Also appears as | Where |
|---|---|---|
| `DEPLOYER_SECRET_KEY` | `STELLAR_DEPLOYER_SECRET_KEY` | `templates/.env.example` |
| `GHCR_TOKEN` | `GHCR_PAT` | earlier revisions of `infra/docs/secrets.md` |
| `ALERTMANAGER_SLACK_WEBHOOK_URL` | `SLACK_WEBHOOK_URL` | earlier revisions of both secrets docs |

`infra/testnet/main.tf` also hardcodes the network passphrase as
`Test Suggested Ledger ; October 2022`, which is not a real Stellar passphrase;
the correct testnet value is `Test SDF Network ; September 2015`. Tracked
separately — it is a code bug, not a documentation one.

## Local Development

Copy the template and fill in development values:

```bash
cp infra/secrets/templates/.env.example .env
```

Never commit `.env`. Do not put deployer secret keys in it — use the
`stellar keys` CLI, which stores them outside the repo.

## Kubernetes (Sealed Secrets — target state)

```bash
# Encrypt a secret
kubectl create secret generic app-secrets \
  --from-literal=STELLAR_RPC_URL=https://soroban-testnet.stellar.org \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > infra/secrets/sealed-app-secrets.yaml
```

A `SealedSecret` is safe to commit — only the in-cluster controller can decrypt
it. Until the controller is deployed, create secrets imperatively and keep them
out of git.

## Rotation Policy

| Secret | Cadence |
|---|---|
| `DEPLOYER_SECRET_KEY` | Every 90 days |
| `VERCEL_TOKEN` | Every 90 days |
| `GHCR_TOKEN` | Every 90 days |
| `NEXTAUTH_SECRET` | Every 90 days (once implemented) |
| AWS credentials | Every 90 days, or migrate to OIDC and drop them entirely |
| `GRAFANA_ADMIN_PASSWORD` | Every 180 days |
| `ALERTMANAGER_SLACK_WEBHOOK_URL` | On personnel change |

Rotation deadlines for the date-based secrets above are tracked in
[`infra/secrets/last-rotated.yml`](./last-rotated.yml) and checked daily by
the [Secret Rotation Check](../../.github/workflows/secret-rotation-check.yml)
workflow, which opens a tracking issue once a secret is within its warning
window. Update `last-rotated.yml` immediately after rotating a secret.

## What Must NEVER Be Committed

- `.env` files
- Unencrypted Kubernetes Secret YAML
- Private keys or seed phrases
- API tokens in plaintext
- `terraform.tfvars` containing credentials

If a secret is accidentally committed, rotate it immediately and check `git log`
for leaked references.

## Verification

1. `git status` shows no `.env` files tracked
2. `.gitignore` includes `.env*`
3. Workflows reference GitHub Secrets, not hardcoded values
4. Once Sealed Secrets is live: `kubeseal --validate -f infra/secrets/`

## Environment template files

Two `.env.example` files exist and serve different purposes:

| File | Purpose |
| ---- | ------- |
| `.env.example` (repo root) | Minimal variables for `docker compose up` (TLS cert paths, compose settings). |
| `infra/secrets/templates/.env.example` | Complete reference of every variable used across the monorepo (Stellar, web app, deployment, registry, monitoring, CI/CD). |

They are intentionally not merged: the root file is the quick-start for local
Docker, the templates file is the authoritative secrets reference. When a new
variable is introduced, add it to the templates file; add it to the root file
only if `docker-compose.yml` needs it.

## In-flight transactions during deployer key rotation

`rotate-deployer-keypair.sh` keeps the old key as `deployer-old` (grace period),
so transactions already signed with the old key remain valid until they
confirm or expire (Stellar transactions carry a `maxTime`). Before rotating:

1. Make sure no deployment workflow is running (`gh run list --workflow deploy`).
2. Wait for any submitted-but-unconfirmed transaction to settle or reach its `maxTime`.
3. Rotate, update `DEPLOYER_SECRET_KEY` in CI/CD, then remove `deployer-old` after the grace period.

Do not remove `deployer-old` while any transaction signed by it may still be pending.

## `validate-env.sh` and `DEPLOYER_SECRET_KEY`

`infra/scripts/deploy/validate-env.sh` checks the frontend contract IDs by
default. `DEPLOYER_SECRET_KEY` is only required (and format-checked) when the
script is run with `--check-deployer-key` or `CHECK_DEPLOYER_KEY=1`.

## Secret scanning

The [Secret Scanning](../../.github/workflows/secret-scanning.yml) workflow runs
gitleaks on every PR and push to `main` that touches `infra/`, `environments/`
or `k8s/`.
