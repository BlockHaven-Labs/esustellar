# Terraform Infrastructure

This directory contains the root Terraform configuration for EsuStellar cloud
resources on AWS, plus the reusable modules it is built from.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6.0
- AWS account with credentials configured (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or an assumed role)
- Remote state bucket and lock table created once per account — see [state-bootstrap/README.md](state-bootstrap/README.md)

## Directory Layout

```
infra/terraform/
├── backend.tf      # S3 remote backend (partial config — see backend/)
├── backend/        # Per-environment backend configs (distinct state keys)
├── providers.tf    # AWS provider version constraints
├── main.tf         # Resource definitions
├── variables.tf    # Input variables
├── outputs.tf      # Output values
├── modules/        # Reusable modules (vpc, iam, ecr, cdn, dns, ssl)
├── state-bootstrap/# One-time bootstrap: state bucket + lock table
├── Makefile        # Validation + workflow targets
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

## Validate

```bash
cd infra/terraform
make validate
```

This runs:
1. `terraform fmt -check -recursive`
2. `terraform init -backend=false -input=false`
3. `terraform validate`

Because it passes `-backend=false`, validation needs no AWS credentials and no
access to the state bucket.

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
