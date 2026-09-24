# GitHub Actions Secrets

This document is the **operator checklist** for the secrets that GitHub Actions
workflows need, configured under
**Settings → Secrets and variables → Actions**.

It is deliberately narrow: it covers *CI/CD only*. The authoritative inventory of
every secret in the monorepo — including runtime and Kubernetes secrets that
never touch GitHub Actions — is
[`infra/secrets/README.md`](../secrets/README.md). If the two disagree, that
document wins.

> **Why this file used to look wrong:** it previously listed a Vercel + GHCR
> secret set while `infra/secrets/README.md` listed a Kubernetes + Sealed
> Secrets set, with almost no overlap, so the two read like two different
> products (#987). Neither was wrong — EsuStellar deploys to several targets.
> The split is now stated explicitly in both files.

## Deployment targets that consume CI secrets

| Target | What it deploys | Workflow |
|---|---|---|
| Stellar (Soroban) | `contracts/` via `deploy.sh` | `deploy-testnet.yml` |
| Vercel | `apps/web` frontend | `deploy-vercel.yml` |
| GHCR | container images | `docs/deployment.md` (manual today) |
| AWS | `infra/terraform` (ECS, CloudFront, ECR, KMS) | none yet — applied locally |
| Kubernetes | `infra/k8s`, `environments/staging` | none yet — applied locally |

## Required secrets

### Committed workflows

These workflows exist in `.github/workflows/` today.

| Secret | Used by | Description | Where to find it |
|---|---|---|---|
| `INFRACOST_API_KEY` | `infracost.yml` | Infracost API key for PR cost estimates | [infracost.io](https://www.infracost.io/) dashboard |

### Generated workflows (not yet committed)

`scripts/generate-workflows.sh` writes these workflow files; they are **not**
committed yet, so their secrets are only needed once you run that script and
commit the result.

| Secret | Used by | Description | Where to find it |
|---|---|---|---|
| `DEPLOYER_SECRET_KEY` | `deploy-testnet.yml` | Stellar deployer account secret key (`S…`) | `stellar keys generate deployer`, or rotate with `infra/scripts/rotate-deployer-keypair.sh` |
| `VERCEL_TOKEN` | `deploy-vercel.yml` | Vercel access token for frontend deploys | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `deploy-vercel.yml` | Vercel organisation / team ID | Vercel project settings |
| `VERCEL_PROJECT_ID` | `deploy-vercel.yml` | Vercel project ID | Vercel project settings |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | `deploy-vercel.yml` | Deployed Registry contract ID (public, build-time) | `deployment-info.json` after `deploy.sh` |
| `NEXT_PUBLIC_SAVINGS_CONTRACT_ID` | `deploy-vercel.yml` | Deployed Savings contract ID (public, build-time) | `deployment-info.json` after `deploy.sh` |

### Not yet wired to any workflow

Documented so the set is complete, but **no workflow reads them today**. Do not
add them expecting CI to pick them up.

| Secret | Intended use | Blocking work |
|---|---|---|
| `GHCR_TOKEN` / `GHCR_USERNAME` | Push/pull images on `ghcr.io` | The `docker-ci.yml` / `ghcr-publish.yml` workflow referenced by `docs/deployment.md` and `infra/secrets/templates/.env.example` does not exist |
| `CODECOV_TOKEN` | Coverage upload | No workflow uploads coverage |
| `KUBE_CONFIG` | `kubectl` / `kustomize` apply from CI | Kubernetes manifests are applied manually |
| AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or OIDC role) | `terraform apply` from CI | Terraform is applied locally; only Infracost (which needs no AWS access) runs in CI |

## Setup Instructions

1. Navigate to the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** for each entry you need from the tables above.
4. Paste the value and save.

Start with the committed-workflow table. You only need the generated-workflow
secrets after running `scripts/generate-workflows.sh` and committing its output.

## Rotating Secrets

- **`DEPLOYER_SECRET_KEY`** — rotate with `infra/scripts/rotate-deployer-keypair.sh`, then run `infra/scripts/deploy/validate-env.sh` to confirm the new key is picked up.
- **`VERCEL_TOKEN`** — revoke the old token in the Vercel dashboard before adding the new one.
- **`GHCR_TOKEN`** — the replacement PAT needs `write:packages` and `read:packages`.
- **`INFRACOST_API_KEY`** — regenerate in the Infracost dashboard; the old key stops working immediately.

Cadences for long-lived secrets are in
[`infra/secrets/README.md`](../secrets/README.md#rotation-policy).

## Local Development

CI secrets are **not** needed locally. Copy
[`infra/secrets/templates/.env.example`](../secrets/templates/.env.example) to
`.env` and fill in the development values. Never commit `.env` or raw secret
values.
