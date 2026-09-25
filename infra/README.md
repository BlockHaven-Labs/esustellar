# Infra Overview

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- Node.js 20+
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

| Concern | Canonical (deployed) | Deprecated / Legacy | Notes |
|---|---|---|---|
| **Kubernetes app manifests** | `infra/k8s/` (Kustomize: `base/` + `overlays/{testnet,staging,mainnet}`) | `k8s/` (plain manifests, per-env dirs), `environments/*/k8s/` | `infra/k8s/` is the Kustomize-based layout with TLS ingress and NetworkPolicies. The `k8s/` root tree duplicates it as flat per-env YAML with a different image name (`esustellar/web` vs `blockhaven/esustellar-web`) and namespace (`esustellar-*` vs `esustellar`); treat it as legacy until deleted. |
| **Monitoring stack** | `infra/monitoring/` (Prometheus, Grafana, Loki, Promtail, Alertmanager) | `monitoring/` (root: `balance-exporter/`), `k8s/monitoring/` | `infra/monitoring/` holds the full deployable stack; its `loki/loki-config.yaml`, `promtail/promtail-config.yaml`, `grafana/datasources/datasources.yaml` are wired into `docker-compose.yml` and `scripts/validate-monitoring-config.sh`. The root `monitoring/` dir and `k8s/monitoring/` manifests predate it; treat as legacy until deleted. |
| **Terraform** | `infra/terraform/` (root module + `modules/` + `state-bootstrap/`) | `environments/{testnet,staging}/main.tf` (standalone env roots) | CI (`infracost.yml`) and `docs/deployment.md` both operate on `infra/terraform/`. The `environments/` Terraform roots are not wired into CI. |
| **Secrets** | `infra/secrets/` (README + `templates/` + `vault/`) | `k8s/config/*-secret.yaml` (example Secret manifests) | See `infra/docs/secrets.md` for the GitHub Actions secrets registry. |
| **Scripts & runbooks** | `infra/scripts/`, `infra/docs/` | `scripts/validate-monitoring-config.sh` (validates both monitoring trees) | — |

If you find a conflict between trees, the canonical column wins; file an issue
so the duplicate can be removed.

### Why the duplicates still exist

- `k8s/` and `monitoring/` (root) predate the `infra/` consolidation (see
  `infra/CHANGELOG.md` v0.1.0) but are still referenced by
  `scripts/validate-monitoring-config.sh` and `docs/logging.md`, so deleting
  them requires cleaning those references first.
- `environments/` contains early per-environment scaffolding (Terraform roots
  and hand-rolled k8s manifests) that was superseded by `infra/k8s/` overlays
  and `infra/terraform/`, but its README still documents an apply flow.

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
└── testnet/           ← testnet-specific Terraform

docs/                  ← repo-wide docs (deployment.md, logging.md, on-call.md, ...)
environments/          ← DEPRECATED per-env scaffolding (see table above)
k8s/                   ← DEPRECATED flat manifests (see table above)
monitoring/            ← DEPRECATED legacy configs (see table above)
.github/workflows/     ← CI: web-ci, contracts-ci, e2e-web, mobile-e2e,
                         accessibility, infracost (terraform)
```
