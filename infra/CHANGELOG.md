# Changelog — infra/

All notable changes to the infrastructure directory are documented here.
This changelog follows the infra versioning strategy defined in `docs/infra-versioning.md`.

## [0.1.0] - 2026-06-26

### Added
- Base Kubernetes manifests for `apps/web` (Deployment, Service, Ingress)
- Kustomize overlays for testnet, staging, and mainnet
- Resource requests and limits for all pods
- Horizontal Pod Autoscaler for the web app
- Ingress with TLS termination via cert-manager + Let's Encrypt
- NetworkPolicies restricting pod-to-pod traffic
- Prometheus deployment with scrape targets
- Grafana deployment with Prometheus datasource
- Grafana dashboards for on-chain events and golden signals
- Alertmanager rule for web app uptime monitoring
- Documentation for compliance, mobile infra, and Stellar protocol upgrades

## [0.2.0] - 2026-07-23

### Added
- Terraform bootstrap module (`infra/terraform/state-bootstrap/`) for S3 + DynamoDB remote state
- Reusable backend config template (`infra/terraform/backend-config.tf`)

## [0.3.0] - 2026-09-23

### Added
- Remote S3 backend for the testnet root (`infra/testnet/backend.tf`) so it never silently uses local state (#1002)
- Scheduled Terraform drift-detection + state-locking CI job (`.github/workflows/terraform-drift.yml`) (#998)
- `verify-state-lock.sh` + `make verify-state-lock` / `make drift-check` targets (#998)
- Shared VPC, private subnets, NAT (<-> internet gateway) in `infra/terraform` for per-environment roots (#1002)

### Changed
- `infra/terraform/backend-config.tf` renamed to `backend-config.tf.example` to prevent a duplicate backend-block compile error (#1001)
- Lock table default aligned to `esustellar-terraform-locks` across `state-bootstrap/`, `backend-config.tf.example`, and docs (#1000, #998, #1002)
- `state-bootstrap/README.md` rewritten with the exact bootstrap order and the `backend.tf` vs `backend-config.tf.example` split (#1001)

### Fixed
- `prevent_destroy = true` now also guards the DynamoDB lock table in `state-bootstrap/` (previously only the S3 bucket) (#1000)
- Duplicate `ecs_cluster_arn` output in `infra/testnet/` resolved (#1002)
