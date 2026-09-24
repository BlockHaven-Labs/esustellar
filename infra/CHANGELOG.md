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

## [0.3.0] - 2026-09-24

### Added
- Per-environment Terraform backend configs with distinct state keys (`infra/terraform/backend/`, `infra/testnet/backend/`, `environments/staging/backend/`) (#990)
- `infra/docs/terraform-state.md` documenting the state-key map for every Terraform root (#990)
- Required `kms_key_arn` input on `modules/iam`, validated to reject wildcards (#991)
- Required `cloudfront_distribution_arn`, `ecs_cluster_arn` and `ecs_service_arns` inputs on `modules/iam`, validated to reject wildcards (#992)

### Changed
- `infra/terraform/backend.tf` is now a partial configuration; bucket, key and lock table are supplied at `terraform init` time (#990)
- Backend bucket and lock-table names aligned with what `state-bootstrap` actually creates (`esustellar-terraform-state` / `terraform-locks`) (#990)
- `infra/secrets/README.md` is now the authoritative secrets inventory, with the multi-target deployment split (Stellar, Vercel, GHCR, Compose, AWS, Kubernetes) stated explicitly (#987)
- `infra/docs/secrets.md` is now scoped to GitHub Actions secrets only and marks which workflows are committed vs generated (#987)

### Removed
- `infra/terraform/backend-config.tf`, a second live `backend` block that broke `terraform init` (#990)

### Fixed
- `terraform init` in `infra/terraform` failed with "Duplicate 'backend' configuration block" (#990)
- `infra/terraform/README.md` contained two conflicting copies of itself concatenated (#990)
- `terraform fmt -check -recursive` failures in `infra/terraform/main.tf` and `infra/testnet/main.tf` (#990)

### Security
- ECS task role no longer holds `kms:Decrypt` / `kms:GenerateDataKey` on `*` (#991)
- CI/CD role no longer holds `cloudfront:CreateInvalidation` or `ecs:UpdateService` on `*`; the unavoidable account-level `ecs:RegisterTaskDefinition` wildcard is isolated in its own statement (#992)
