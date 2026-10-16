# Read this first: production deployment target
#
# [ADR 003](../docs/adr/003-kubernetes-deployment-target.md) selects Kubernetes
# for production. The canonical workload manifests are `infra/k8s/` (Kustomize:
# `base/` + `overlays/{mainnet,staging,testnet}`).
# This identifies the configuration source of truth; it does not imply that a
# Kubernetes cluster is provisioned here or that a committed workflow applies
# these manifests.
#
# Vercel's generated workflow template is not committed and is not the
# production source of truth. It currently includes `--prod`, which conflicts
# with ADR 003; do not enable it for production without revisiting that decision.
# ECS-related Terraform IAM scaffolding is likewise not a current deployment
# path. If this summary and the ADR ever disagree, the ADR is the decision record.

# Infra Overview

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- Node.js 20+
- kubectl + kustomize (the production path)
- Terraform >= 1.6 (infrastructure provisioning)
- Access to Stellar testnet/mainnet RPC

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Set up env vars
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with contract IDs and RPC URL

# 3. Deploy contracts
./deploy.sh

# 4. Start with Docker
docker compose up --build
```

## Canonical Sources of Truth

The repo contains more than one copy of some infrastructure trees (the result
of parallel early experiments and a gradual consolidation under `infra/`). To
avoid guessing, the table below records which directory is authoritative for
each concern today, and what the status of every duplicate is.

**Rule of thumb: anything under `infra/` is canonical unless marked otherwise
here. Do not edit deprecated trees except to delete them.**

| Concern | Canonical source of truth | Deprecated / Legacy / Reference | Notes |
|---|---|---|---|
| **Kubernetes app manifests** | `infra/k8s/` (Kustomize: `base/` + `overlays/{testnet,staging,mainnet}`) | Root `k8s/` flat per-environment manifests; reference only | `infra/k8s/` is the only canonical Kustomize workload tree and is checked by `k8s-overlay-validation.yml`. The root `k8s/` tree has different image names and namespaces; do not use it as the deployment source. |
| **Monitoring configuration** | `infra/monitoring/` | Root `monitoring/` and `k8s/monitoring/`; legacy/reference | Prometheus, Grafana, Alertmanager, Loki and Promtail configuration is maintained under `infra/monitoring/`. The older `k8s/monitoring/` Loki/Promtail manifests have not been consolidated; treat them as legacy references, not independent configuration authority. Root `monitoring/` is also legacy. |
| **Terraform** | `infra/terraform/` for shared AWS resources/modules and state bootstrap; `infra/testnet/` for the testnet-specific root | `environments/staging/` standalone Terraform root; `environments/testnet/` early sandbox/config | `infracost.yml` and `docs/deployment.md` use `infra/terraform/`. `infra/testnet/` remains a distinct testnet root; do not confuse it with the superseded `environments/` roots. |
| **Secrets** | `infra/secrets/` (inventory, templates and Vault bootstrap) | `k8s/config/*-secret.yaml` placeholders; legacy examples only | No SealedSecret manifests are currently committed. See `infra/docs/secrets.md` for the GitHub Actions subset; see `infra/secrets/README.md` for the full inventory and runtime-secret status. |
| **Scripts & runbooks** | `infra/scripts/`, `infra/docs/` | Root `scripts/validate-monitoring-config.sh` includes legacy-tree checks | Infrastructure operations and runbooks should be maintained under `infra/`. |

If you find a conflict between trees, the canonical column wins; file an issue
so the duplicate can be removed.

### Why the duplicates still exist

- Root `k8s/` and `monitoring/` predate the `infra/` consolidation (see
  `infra/CHANGELOG.md` v0.1.0) and still have references in validation and
  logging documentation. The Loki/Promtail manifests under `k8s/monitoring/`
  are legacy references pending consolidation; they do not change the
  `infra/monitoring/` configuration source of truth.
- `environments/` contains early standalone Terraform and sandbox scaffolding.
  Its Terraform roots are not wired into CI; use `infra/terraform/` for shared
  infrastructure and `infra/testnet/` for the testnet-specific Terraform root.

## Directory Layout

```
infra/
├── README.md          ← this file
├── CHANGELOG.md
├── k8s/               ← canonical Kubernetes manifests (Kustomize)
├── monitoring/        ← canonical monitoring stack (Prometheus/Grafana/Loki)
├── terraform/         ← canonical Terraform (AWS: VPC, ECR, CDN, DNS, SSL, IAM)
├── secrets/           ← secrets templates + Vault bootstrap
├── scripts/           ← deploy, healthcheck, rollback, smoke-test
├── docs/              ← runbooks + secrets registry
├── backups/           ← indexer backup scripts
└── testnet/           ← canonical testnet-specific Terraform root

docs/                  ← repo-wide docs (deployment.md, logging.md, on-call.md, ...)
environments/          ← DEPRECATED per-env scaffolding (see table above)
k8s/                   ← DEPRECATED flat manifests (see table above)
monitoring/            ← DEPRECATED legacy configs (see table above)
.github/workflows/     ← CI: web/contracts/mobile checks, Kustomize validation,
                         sealed-secret validation, Terraform cost/drift checks
```

## `infra/testnet/` vs `environments/testnet/`

- `infra/testnet/` is the **Terraform root** for testnet cloud
  infrastructure; it wraps the shared module in `infra/terraform/`.
- `environments/testnet/` is the **contract-deployment and local Docker
  Compose workspace** (`scripts/deploy.sh`, `docker-compose.yml`).
- Changing cloud resources: edit `infra/testnet/`. Deploying contracts or
  running testnet locally: use `environments/testnet/`. App manifests live
  in `infra/k8s/overlays/testnet/`.
