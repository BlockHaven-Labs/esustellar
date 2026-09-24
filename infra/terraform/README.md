# Terraform Infrastructure

This directory contains the shared root Terraform configuration for EsuStellar cloud resources on AWS, plus the `state-bootstrap/` root that creates the remote state bucket and lock table.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6.0
- AWS account with credentials configured (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or assumed role)
- S3 bucket (`esustellar-terraform-state`) and DynamoDB lock table (`esustellar-terraform-locks`) created by `state-bootstrap/` (see below)

## Directory Layout

```
infra/terraform/
├── backend.tf                 # Live S3 remote backend + DynamoDB locking (this root)
├── backend-config.tf.example  # Copy-paste TEMPLATE for NEW environment roots — never a live .tf
├── providers.tf               # AWS provider version constraints + default tags
├── main.tf                    # Shared resources (uploads bucket, KMS key, VPC + subnets)
├── variables.tf               # Input variables
├── outputs.tf                 # Output values (incl. common_tags / vpc_id / private_subnet_ids)
├── Makefile                   # Validation + workflow targets
├── README.md                  # This file
└── state-bootstrap/           # One-time bootstrap of the S3 bucket + DynamoDB lock table
```

## Bootstrap (one time per AWS account)

The remote backend for every root is created by `state-bootstrap/`. The exact
order is documented in [state-bootstrap/README.md](state-bootstrap/README.md):

1. `terraform init && terraform apply` inside `state-bootstrap/` (uses **local** state, chicken-and-egg — the bucket doesn't exist yet).
2. `terraform init -reconfigure` in *this* directory → starts using S3 (`infra/terraform.tfstate`).
3. Each environment root (`infra/testnet/`, …) points at its own S3 key.

> ⚠️ The two-file split (`backend.tf` vs `backend-config.tf`) used to be a
> common source of confusion — `backend.tf` is the **live** backend for this
> root, while `backend-config.tf.example` is only a **template** for brand-new
> roots. Keeping the template as `.tf.example` also prevents Terraform from
> compiling a duplicate backend block.

## Adding a new environment root

```bash
mkdir -p infra/<env>
cp infra/terraform/backend-config.tf.example infra/<env>/backend.tf
# edit infra/<env>/backend.tf: replace <ENV> with the environment name
# (state key becomes <env>/terraform.tfstate)
```

Then `terraform init -backend=true -reconfigure` from that root.

## Validate

```bash
cd infra/terraform
make validate
```

This runs:
1. `terraform fmt -check -recursive`
2. `terraform init -backend=false`
3. `terraform validate`

The same checks are wired into `.github/workflows/terraform-drift.yml`; a
scheduled job also runs `terraform plan` against the real backend to catch
drift (see issue #998).

## Apply

```bash
cd infra/terraform

# Review changes
make plan

# Apply changes
make apply
```

## Variables

| Variable | Description | Default |
|---|---|---|
| `aws_region` | AWS region for resources | `us-east-1` |
| `environment` | Deployment environment | — (required) |
| `project_name` | Project name prefix | `esustellar` |
| `enable_logging` | Enable audit logging | `true` |
| `allowed_ingress_cidrs` | Allowed inbound CIDR blocks | `["0.0.0.0/0"]` |

## Remote Backend

State is stored in S3 with:
- **Bucket:** `esustellar-terraform-state`
- **Key:** `infra/terraform.tfstate`
- **DynamoDB Lock Table:** `esustellar-terraform-locks`
- **Encryption:** Enabled

## Related

- [state-bootstrap/README.md](state-bootstrap/README.md) — bootstrap order + safeguard notes (`#1000`, `#1001`)
- [testnet roots](../testnet/) — per-environment root using this shared module; remote backend via `backend.tf`
- Blocked changes are detected by `.github/workflows/terraform-drift.yml` (`#998`)