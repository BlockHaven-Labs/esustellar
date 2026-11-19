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
- Remote S3 backend for the testnet root (`infra/testnet/backend.tf`) so it never silently uses local state (#1002)
- Scheduled Terraform drift-detection + state-locking CI job (`.github/workflows/terraform-drift.yml`) (#998)
- `verify-state-lock.sh` + `make verify-state-lock` / `make drift-check` targets (#998)
- Shared VPC, private subnets, NAT (<-> internet gateway) in `infra/terraform` for per-environment roots (#1002)

### Changed
- `infra/terraform/backend.tf` is now a partial configuration; bucket, key and lock table are supplied at `terraform init` time (#990)
- Backend bucket and lock-table names aligned with what `state-bootstrap` actually creates (`esustellar-terraform-state` / `terraform-locks`) (#990)
- `infra/secrets/README.md` is now the authoritative secrets inventory, with the multi-target deployment split (Stellar, Vercel, GHCR, Compose, AWS, Kubernetes) stated explicitly (#987)
- `infra/docs/secrets.md` is now scoped to GitHub Actions secrets only and marks which workflows are committed vs generated (#987)
- `infra/terraform/backend-config.tf` renamed to `backend-config.tf.example` to prevent a duplicate backend-block compile error (#1001)
- Lock table default aligned to `esustellar-terraform-locks` across `state-bootstrap/`, `backend-config.tf.example`, and docs (#1000, #998, #1002)
- `state-bootstrap/README.md` rewritten with the exact bootstrap order and the `backend.tf` vs `backend-config.tf.example` split (#1001)

### Removed
- `infra/terraform/backend-config.tf`, a second live `backend` block that broke `terraform init` (#990)

### Fixed
- `terraform init` in `infra/terraform` failed with "Duplicate 'backend' configuration block" (#990)
- `infra/terraform/README.md` contained two conflicting copies of itself concatenated (#990)
- `terraform fmt -check -recursive` failures in `infra/terraform/main.tf` and `infra/testnet/main.tf` (#990)
- `prevent_destroy = true` now also guards the DynamoDB lock table in `state-bootstrap/` (previously only the S3 bucket) (#1000)
- Duplicate `ecs_cluster_arn` output in `infra/testnet/` resolved (#1002)

### Security
- ECS task role no longer holds `kms:Decrypt` / `kms:GenerateDataKey` on `*` (#991)
- CI/CD role no longer holds `cloudfront:CreateInvalidation` or `ecs:UpdateService` on `*`; the unavoidable account-level `ecs:RegisterTaskDefinition` wildcard is isolated in its own statement (#992)

## [Unreleased]

### Added
- `infra/scripts/deploy/set-image-tag.sh` pins an overlay's web image to a release version, git SHA or digest and can check that it is pinned (#1469)
- `infra/scripts/check-raw-secrets.py` fails when a plain Kubernetes `Secret` manifest holds more than the allowed non-sensitive placeholders (#1468)
- "In-flight transactions during rotation" section in `docs/runbooks/deployer-keypair-rotation.md`; `rotate-deployer-keypair.sh` now asks the operator to confirm nothing is in flight (#1466)

### Fixed
- `Secret Scanning` ran `gitleaks/gitleaks-action@v2`, which fails for organization repositories without a paid license, so every run failed. It now runs the pinned, checksum-verified gitleaks CLI on every pull request and push to main (#1468)
- `rotate-deployer-keypair.sh` can no longer leak the new secret through shell tracing (`bash -x` printed it), creates its credentials file with `mktemp` under `umask 077` instead of a predictable name, and warns that it must run in an interactive, unlogged terminal (#1458)

### Changed
- `infra/docs/secrets.md` rotation instructions point at the in-flight guidance; `validate-env.sh --check-deployer-key` is the check that covers `DEPLOYER_SECRET_KEY` (#1466, #1467)
- `infra/scripts/check-env-example-sync.py` and the `Env Example Sync` workflow keep the root `.env.example` and `infra/secrets/templates/.env.example` consistent; the relationship is documented in `infra/secrets/README.md` (#1465)

### Changed
- `rotate-deployer-keypair.sh` rejects unknown networks, retries the mainnet balance check for Horizon lag, and records the rotation date in `infra/secrets/last-rotated.yml` (#1462, #1463)
- `infra/secrets/README.md` links the sealed-secrets validation and rotation-check workflows from the verification and rotation sections (#1463, #1464)
- `k8s-overlay-validation.yml` now asserts each overlay's Ingress host, TLS hosts and secret, Certificate `dnsNames`, the absence of a cert-manager issuer annotation on the Ingress, and that the HPA scales on both CPU and memory (#1470, #1471, #1472, #1473)

### Changed
- `infra/k8s/README.md` documents per-overlay hostnames, the explicit-Certificate TLS decision, the HPA metrics and why staging targets testnet (#1470, #1471, #1472, #1473)
