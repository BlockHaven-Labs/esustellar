# Terraform Infrastructure

This directory contains the shared root Terraform configuration for EsuStellar cloud resources on AWS, plus the reusable modules and the `state-bootstrap/` root that creates the remote state bucket and lock table.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6.0
- AWS account with credentials configured (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or an assumed role)
- S3 bucket (`esustellar-terraform-state`) and DynamoDB lock table (`terraform-locks`) created once per AWS account by `state-bootstrap/` — see [state-bootstrap/README.md](state-bootstrap/README.md)

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
├── backend.tf      # S3 remote backend (partial config — see backend/)
├── backend/        # Per-environment backend configs (distinct state keys)
├── backend-config.tf.example  # Copy-paste TEMPLATE for new environment roots — never a live .tf
├── providers.tf    # AWS provider version constraints
├── main.tf         # Resource definitions (uploads bucket, KMS key, VPC + subnets)
├── variables.tf    # Input variables
├── outputs.tf      # Output values (incl. common_tags / vpc_id / private_subnet_ids)
├── modules/        # Reusable modules (vpc, iam, ecr, cdn, dns, ssl)
├── scripts/        # Operational scripts
├── Makefile        # Validation + workflow targets
├── state-bootstrap/# One-time bootstrap: state bucket + lock table
└── README.md       # This file
```

## Bootstrap (One-Time, Per AWS Account)

The remote state bucket and DynamoDB lock table are themselves managed by
Terraform, in `state-bootstrap/` (which uses local state — it creates the very
resources a remote backend would need):

```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars   # review bucket / table names
terraform init
terraform apply
```

The exact bootstrap order and safeguards are documented in
[state-bootstrap/README.md](state-bootstrap/README.md):

1. `terraform init && terraform apply` inside `state-bootstrap/` (uses **local** state, chicken-and-egg — the bucket doesn't exist yet).
2. `terraform init -reconfigure -backend-config=backend/testnet.hcl` (or `staging.hcl`/`mainnet.hcl`) in *this* directory → starts using S3 (per-environment key from `backend/*.hcl`).
3. Each environment root (`infra/testnet/`, `environments/staging/`, …) points at its own S3 key.

This creates:

| Resource | Default name |
|---|---|
| S3 state bucket (versioned, encrypted, public access blocked) | `esustellar-terraform-state` |
| DynamoDB lock table | `terraform-locks` |

## Initialise

This root is applied **once per environment**, and each environment keeps its
own state key. The backend is a
[partial configuration](https://developer.hashicorp.com/terraform/language/backend#partial-configuration),
so pass the matching config file at `init` time:

```bash
cd infra/terraform
terraform init -backend-config=backend/testnet.hcl   # or staging.hcl / mainnet.hcl
```

Use `-reconfigure` when switching environments:

```bash
terraform init -reconfigure -backend-config=backend/staging.hcl
```

The full state-key map for every Terraform root in the repo is in
[infra/docs/terraform-state.md](../docs/terraform-state.md).

> ⚠️ The two-file split (`backend.tf` vs `backend-config.tf.example`) used to be a
> common source of confusion — `backend.tf` is the **partial** backend for this
> root, while `backend-config.tf.example` is only a **template** for brand-new
> roots. Keeping the template as `.tf.example` also prevents Terraform from
> compiling a duplicate backend block.

## Adding a new environment root

```bash
mkdir -p infra/<env>
cp infra/terraform/backend/testnet.hcl infra/terraform/backend/<env>.hcl
# edit infra/terraform/backend/<env>.hcl: set the state key to <env>/terraform.tfstate
```

Or, when mirroring the older root-template flow, copy
`infra/terraform/backend-config.tf.example` to `infra/<env>/backend.tf` and
replace `<ENV>` with the environment name, then run
`terraform init -backend=true -reconfigure` from that root.

## Validate

```bash
cd infra/terraform
make validate
```

This runs:
1. `terraform fmt -check -recursive`
2. `terraform init -backend=false -input=false`
3. `terraform validate`

The same checks are wired into `.github/workflows/terraform-drift.yml`; a
scheduled job also runs `terraform plan` against the real backend to catch
drift (see issue #998).
Because it passes `-backend=false`, validation needs no AWS credentials and no
access to the state bucket. The same checks are wired into
`.github/workflows/terraform-drift.yml`; a scheduled job also runs
`terraform plan` against the real backend to catch drift (see issue #998).

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
| `environment` | Deployment environment (`testnet`, `staging`, `mainnet`) | *(required)* |
| `project_name` | Project name prefix | `esustellar` |
| `enable_logging` | Enable audit logging | `true` |
| `allowed_ingress_cidrs` | Allowed inbound CIDR blocks | `["0.0.0.0/0"]` |

## Remote Backend

State is stored in S3 with:
- **Bucket:** `esustellar-terraform-state`
- **Key:** `infra/terraform.tfstate`
- **DynamoDB Lock Table:** `esustellar-terraform-locks`
- **Encryption:** Enabled
## Modules

| Module | Purpose |
|---|---|
| `modules/vpc` | Network foundation |
| `modules/iam` | Least-privilege roles for ECS tasks and CI/CD |
| `modules/ecr` | Container image repositories |
| `modules/cdn` | CloudFront distribution |
| `modules/dns` | Route 53 records |
| `modules/ssl` | ACM certificates |

`modules/iam` requires the ARNs of the resources each role may touch
(`kms_key_arn`, `cloudfront_distribution_arn`, `ecs_cluster_arn`,
`ecs_service_arns`) so that no policy is granted on `"*"`. See
[modules/iam/variables.tf](modules/iam/variables.tf).

State is stored in S3 (bucket `esustellar-terraform-state`, DynamoDB lock table
`terraform-locks`, encryption enabled). Because this root is applied **once per
environment**, the state key comes from the `backend/*.hcl` config you pass at
`init` time (e.g. `infra/terraform/testnet/terraform.tfstate`); see
[infra/docs/terraform-state.md](../docs/terraform-state.md) for the full map.

## Related

- [state-bootstrap/README.md](state-bootstrap/README.md) — bootstrap order + safeguard notes (`#1000`, `#1001`)
- [testnet roots](../testnet/) — per-environment root using this shared module; remote backend via `backend.tf`
- Blocked changes are detected by `.github/workflows/terraform-drift.yml` (`#998`)
