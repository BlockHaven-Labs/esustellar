# Secrets Management Strategy

This is the **authoritative inventory** of secrets used by EsuStellar.
[`infra/docs/secrets.md`](../docs/secrets.md) is the operator checklist for the
subset required by committed GitHub Actions workflows, and
[`infra/secrets/templates/.env.example`](templates/.env.example) is the
annotated local-development template.

## Deployment decision and secret boundaries

ADR 003 selects Kubernetes as the production deployment target. The canonical
workload manifests are in `infra/k8s/` and the canonical monitoring
configuration is in `infra/monitoring/`. There is no committed workflow that
applies Kubernetes manifests.

| Target | What runs there | Defined in / status |
|---|---|---|
| **Stellar / Soroban** | `savings` and `registry` contracts | `contracts/`, `deploy.sh`; generated deploy workflow is not committed |
| **Kubernetes** | Production workloads and monitoring | `infra/k8s/`, `infra/monitoring/`; secrets are runtime values |
| **GHCR** | Container images used by manual image/rollout instructions | `docs/deployment.md`; no committed publishing workflow |
| **Vercel** | Optional workflow template for `apps/web`, not production source of truth | `scripts/generate-workflows.sh`; generated workflow is not committed |
| **AWS** | Terraform-managed infrastructure | `infra/terraform/` and the testnet-specific `infra/testnet/` root |
| **Docker Compose** | Local development and documented testnet sandbox | `docker-compose.yml`, `environments/testnet/docker-compose.yml` |

The generated Vercel template currently includes `--prod`, which conflicts with
ADR 003. Do not treat it as an active production path unless the deployment
decision is explicitly revisited. `KUBE_CONFIG` is read by the committed
sealed-secret validation workflow only when sealed-secret YAML manifests are
present under `infra/secrets/`; none are currently committed. Vercel/GHCR
credentials are not needed to deploy the canonical Kubernetes manifests.

## Storage mechanism by target

| Target | Mechanism |
|---|---|
| Local development | `.env` files (gitignored) |
| GitHub Actions | GitHub encrypted repository secrets; see [`infra/docs/secrets.md`](../docs/secrets.md) for current committed-workflow needs |
| Vercel | Vercel project environment variables only if the optional generated workflow is intentionally enabled |
| AWS | SSM Parameter Store (see `infra/testnet/main.tf`), KMS-encrypted at rest |
| Kubernetes | Kubernetes `Secret` objects; Sealed Secrets have no manifests committed yet |
| Docker Compose | host `.env` file, not committed |

### Sealed Secrets status

There are no `SealedSecret` manifests committed under `infra/secrets/` yet.
The committed `validate-sealed-secrets.yml` workflow runs
`kubeseal --validate` against the cluster only when such YAML manifests exist.
Until manifests are added, create Kubernetes secrets out-of-band and never
commit raw secret values. Treat the recipe below as the intended authoring flow.

## Secrets Inventory

**Status** is `Active` if current code/configuration consumes the value,
`Conditional` if a committed workflow consumes it only when a stated
prerequisite exists, `Planned` if it is intended for work that does not exist
yet, and `Optional` if it belongs only to a non-canonical workflow template.

### Blockchain / RPC

| Secret | Target | Status | Description |
|---|---|---|---|
| `STELLAR_RPC_URL` | AWS, k8s, local | Active | Soroban RPC endpoint. Stored in SSM by `infra/testnet/main.tf` |
| `STELLAR_NETWORK_PASSPHRASE` | AWS, k8s, local | Active | `Test SDF Network ; September 2015` (testnet) or `Public Global Stellar Network ; September 2015` (mainnet) |
| `DEPLOYER_SECRET_KEY` | Local deployment; optional generated GitHub Actions workflow | Active | Stellar account used for contract deployment. The generated CI workflow is not committed. Rotate with `infra/scripts/rotate-deployer-keypair.sh` |

`STELLAR_RPC_URL` and `STELLAR_NETWORK_PASSPHRASE` are **configuration, not
credentials** — they are public endpoint values. They are listed here because
they are delivered through the same secret plumbing.

### Web application

| Secret | Target | Status | Description |
|---|---|---|---|
| `VERCEL_TOKEN` | Optional generated workflow | Optional | Authenticates the Vercel deploy template; not part of the canonical production path |
| `VERCEL_ORG_ID` | Optional generated workflow | Optional | Vercel organisation / team ID |
| `VERCEL_PROJECT_ID` | Optional generated workflow | Optional | Vercel project ID |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Optional generated workflow | Optional | Build-time contract ID (public — `NEXT_PUBLIC_*` is exposed to the browser) |
| `NEXT_PUBLIC_SAVINGS_CONTRACT_ID` | Optional generated workflow | Optional | Build-time contract ID (public) |
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
| `KUBE_CONFIG` | GitHub Actions | Conditional | Base64 kubeconfig used by `validate-sealed-secrets.yml` to query the Sealed Secrets controller; needed only when sealed-secret YAML manifests exist under `infra/secrets/`, not for CI apply |

### Monitoring

| Secret | Target | Status | Description |
|---|---|---|---|
| `GRAFANA_ADMIN_PASSWORD` | k8s | Active | Supplied via the `grafana-admin` Secret (key `password`), read as `GF_SECURITY_ADMIN_PASSWORD` in `infra/monitoring/grafana/grafana-deployment.yaml` |
| `SLACK_WEBHOOK_URL` | k8s | Active | Alertmanager reads this environment variable from the `alertmanager-secrets` Kubernetes Secret (key `slack-webhook-url`). It is a runtime secret, not a GitHub Actions secret |
| `CODECOV_TOKEN` | GitHub Actions | Planned | Coverage upload — no workflow uploads coverage yet |

## Known naming inconsistencies

These names refer to the same value in different places. The **canonical** column
is what new code should use; the others are legacy spellings that should be
migrated.

| Canonical | Also appears as | Where |
|---|---|---|
| `DEPLOYER_SECRET_KEY` | `STELLAR_DEPLOYER_SECRET_KEY` | `templates/.env.example` |
| `GHCR_TOKEN` | `GHCR_PAT` | earlier revisions of `infra/docs/secrets.md` |
| `SLACK_WEBHOOK_URL` | `ALERTMANAGER_SLACK_WEBHOOK_URL` | `templates/.env.example`; Kubernetes Secret key is `slack-webhook-url` |

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

## Deployer key rotation safeguards

`infra/scripts/rotate-deployer-keypair.sh`:

- never prints the new secret key to stdout; it is written to a mode-600 temp file that is shredded on exit;
- verifies the new key (address match) before touching the old key;
- keeps the previous key as `deployer-old` for a 24h grace period so CI/CD secret updates can be rolled back.

If updating `DEPLOYER_SECRET_KEY` in CI/CD fails, restore with
`stellar keys add deployer --secret-key <old secret>` from `deployer-old`.
