# Terraform Infrastructure

This directory contains the root Terraform configuration for EsuStellar cloud resources on AWS.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6.0
- AWS account with credentials configured (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or assumed role)
- S3 bucket (`esustellar-terraform-state`) and DynamoDB lock table (`esustellar-terraform-locks`) pre-created in `us-east-1`

## Directory Layout

```
infra/terraform/
├── backend.tf      # S3 remote backend + DynamoDB locking
├── providers.tf    # AWS provider version constraints
├── main.tf         # Resource definitions
├── variables.tf    # Input variables
├── outputs.tf      # Output values
├── Makefile        # Validation + workflow targets
└── README.md       # This file
```

## Bootstrap (One-Time)

Before the first `terraform init`, create the remote state bucket and lock table:

```bash
aws s3 mb s3://esustellar-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name esustellar-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Validate

```bash
cd infra/terraform
make validate
```

This runs:
1. `terraform fmt -check -recursive`
2. `terraform init -backend=false`
3. `terraform validate`

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
| `environment` | Deployment environment | `testnet` |
| `project_name` | Project name prefix | `esustellar` |
| `enable_logging` | Enable audit logging | `true` |
| `allowed_ingress_cidrs` | Allowed inbound CIDR blocks | `["0.0.0.0/0"]` |

## Remote Backend

State is stored in S3 with:
- **Bucket:** `esustellar-terraform-state`
- **Key:** `infra/terraform.tfstate`
- **DynamoDB Lock Table:** `esustellar-terraform-locks`
- **Encryption:** Enabled
# Terraform

This directory contains Terraform configurations for managing EsuStellar infrastructure.

## Layout

```
terraform/
├── README.md                # This file
├── backend-config.tf        # Reusable remote backend config template
└── state-bootstrap/         # Bootstrap module: S3 bucket + DynamoDB for remote state
```

## Quick Start

### 1. Bootstrap remote state infrastructure

See [state-bootstrap/README.md](state-bootstrap/README.md).

### 2. Use the remote backend

After bootstrapping, copy `backend-config.tf` into each Terraform module and update the `key` to match the environment (e.g. `testnet/terraform.tfstate`).

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- AWS credentials configured (env vars, `~/.aws/credentials`, or IAM role)
