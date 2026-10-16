# GitHub Actions Secrets

This document is the **operator checklist** for the secrets that GitHub Actions
workflows need, configured under
**Settings → Secrets and variables → Actions**.

It is deliberately narrow: it covers *CI/CD only*. The authoritative inventory of
every secret in the monorepo — including runtime and Kubernetes secrets that
never touch GitHub Actions — is
[`infra/secrets/README.md`](../secrets/README.md). If the two disagree, that
document wins.

## Deployment decision

The production deployment target is Kubernetes, as recorded in
[`docs/adr/003-kubernetes-deployment-target.md`](../../docs/adr/003-kubernetes-deployment-target.md).
The canonical workload manifests are in `infra/k8s/`; Kubernetes secrets are
runtime secrets, not automatically GitHub Actions secrets. There is currently no
committed workflow that applies those manifests.

Vercel is **not** the production source of truth. `scripts/generate-workflows.sh`
contains an optional Vercel workflow template (which uses `--prod`), but that
workflow is not committed and conflicts with the accepted deployment decision;
do not configure its secrets or generate/use it as the production deploy path
without revisiting the ADR. GHCR is used by the manual image instructions in
[`docs/deployment.md`](../../docs/deployment.md), but no committed workflow
publishes images there.

## Deployment targets and their CI workflow status

| Target | Current status | Workflow / operator path |
|---|---|---|
| Kubernetes | Production target; manifests under `infra/k8s/` | Applied manually; no committed apply workflow |
| Stellar (Soroban) | Contract deployment script exists | `deploy.sh` locally; generated workflow template is not committed |
| Vercel | Optional, non-canonical generated workflow template | Not committed; not the production path |
| GHCR | Container registry for manual image operations | `docs/deployment.md`; no committed image-publishing workflow |
| AWS | Terraform infrastructure | `infra/terraform/`; applied locally, no Terraform apply workflow |

## Secrets used by committed workflows

These are the only secrets read by committed workflows. `KUBE_CONFIG` is
conditional: the validation workflow needs it only when a YAML manifest exists
under `infra/secrets/` (excluding `last-rotated.yml`). There are currently no
SealedSecret manifests there, so the workflow exits before requesting cluster
credentials.

| Secret | Used by | Description | Where to find it |
|---|---|---|---|
| `INFRACOST_API_KEY` | `infracost.yml` | Infracost API key for PR cost estimates | [infracost.io](https://www.infracost.io/) dashboard |
| `KUBE_CONFIG` | `validate-sealed-secrets.yml` (conditional) | Base64-encoded kubeconfig for `kubeseal --validate` against the cluster controller; not used to apply manifests | Cluster administrator |

## Optional, not currently active in GitHub Actions

The following are referenced by generated workflow templates or manual
operations, not by the committed workflows. Do not create them just to enable
the canonical Kubernetes deployment path.

| Secret | Used by | Description | Where to find it |
|---|---|---|---|
| `DEPLOYER_SECRET_KEY` | Generated `deploy-testnet.yml` template | Stellar deployer account secret key (`S…`) | `stellar keys generate deployer`, or rotate with `infra/scripts/rotate-deployer-keypair.sh` |
| `VERCEL_TOKEN` | Generated `deploy-vercel.yml` template | Vercel access token; template is non-canonical and not committed | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Generated `deploy-vercel.yml` template | Vercel organisation / team ID | Vercel project settings |
| `VERCEL_PROJECT_ID` | Generated `deploy-vercel.yml` template | Vercel project ID | Vercel project settings |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Generated `deploy-vercel.yml` template | Public build-time Registry contract ID | `deployment-info.json` after `deploy.sh` |
| `NEXT_PUBLIC_SAVINGS_CONTRACT_ID` | Generated `deploy-vercel.yml` template | Public build-time Savings contract ID | `deployment-info.json` after `deploy.sh` |
| `GHCR_USERNAME` / `GHCR_TOKEN` | Manual GHCR image operations | Registry credentials; no publishing workflow exists | GitHub account / package access settings |
| AWS credentials or OIDC role | Local `terraform apply` today | Terraform credentials; not read by a committed workflow | AWS account administrator |
| `CODECOV_TOKEN` | Intended coverage upload | No workflow uploads coverage | Codecov project settings |
| `SLACK_WEBHOOK_URL` | Kubernetes Alertmanager runtime | Runtime secret, not a GitHub Actions secret | Slack workspace administrator |

## Setup Instructions

1. Navigate to the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** for each committed-workflow secret that is
   currently required. Add `KUBE_CONFIG` when sealed-secret manifests are
   introduced under `infra/secrets/`.
4. Paste the value and save.

Only add optional entries if you intentionally enable that separate workflow or
manual operation; in particular, Vercel secrets do not enable the canonical
Kubernetes deployment.

## Rotating Secrets

- **`DEPLOYER_SECRET_KEY`** — rotate with `infra/scripts/rotate-deployer-keypair.sh`, then run `infra/scripts/deploy/validate-env.sh --check-deployer-key` to confirm the new key is picked up and has the expected `S…` Stellar secret-key format.
- **`VERCEL_TOKEN`** — only if intentionally enabling the generated Vercel workflow; revoke the old token in the Vercel dashboard before adding the new one.
- **`GHCR_TOKEN`** — for manual image operations, the replacement PAT needs `write:packages` and `read:packages`.
- **`INFRACOST_API_KEY`** — regenerate in the Infracost dashboard; the old key stops working immediately.

Cadences for long-lived secrets are in
[`infra/secrets/README.md`](../secrets/README.md#rotation-policy).

## Local Development

CI secrets are **not** needed locally. Copy
[`infra/secrets/templates/.env.example`](../secrets/templates/.env.example) to
`.env` and fill in the development values. Never commit `.env` or raw secret
values.
