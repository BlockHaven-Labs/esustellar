# Terraform Remote State

Every Terraform **root** in this repository stores its state in the shared S3
bucket created by [`infra/terraform/state-bootstrap`](../terraform/state-bootstrap/README.md),
under a **distinct state key**.

Roots must never share a state key: `terraform apply` writes the whole state
object, so two roots pointing at the same key will silently overwrite each
other's resources.

## State-key map

| Terraform root | Backend config | State key |
|---|---|---|
| `infra/terraform` (shared AWS root, testnet) | `backend/testnet.hcl` | `infra/terraform/testnet/terraform.tfstate` |
| `infra/terraform` (shared AWS root, staging) | `backend/staging.hcl` | `infra/terraform/staging/terraform.tfstate` |
| `infra/terraform` (shared AWS root, mainnet) | `backend/mainnet.hcl` | `infra/terraform/mainnet/terraform.tfstate` |
| `infra/testnet` (testnet ECS environment) | `backend/testnet.hcl` | `infra/testnet/terraform.tfstate` |
| `environments/staging` (staging Kubernetes) | `backend/staging.hcl` | `environments/staging/terraform.tfstate` |
| `infra/terraform/state-bootstrap` | *(none — local state)* | `terraform.tfstate` on disk |

`environments/testnet` is **not** a Terraform root — it holds Docker Compose and
raw Kubernetes manifests only, so it has no state.

`infra/terraform/state-bootstrap` deliberately uses **local state**: it creates
the bucket and lock table that every other root depends on, so it cannot store
its state in them.

## Shared backend resources

Both are created by `infra/terraform/state-bootstrap`:

| Resource | Name |
|---|---|
| S3 state bucket | `esustellar-terraform-state` |
| DynamoDB lock table | `terraform-locks` |
| Region | `us-east-1` |

These values are the defaults in
[`state-bootstrap/terraform.tfvars.example`](../terraform/state-bootstrap/terraform.tfvars.example)
and are mirrored in every `backend/*.hcl` file. If you change them at bootstrap
time, update the `backend/*.hcl` files to match.

## Initialising a root

Backends use [partial configuration](https://developer.hashicorp.com/terraform/language/backend#partial-configuration):
`backend "s3" {}` is declared in code and the bucket/key/table are supplied at
`init` time. This is what keeps the key per-environment — Terraform does not
allow variables inside a `backend` block.

```bash
# Shared AWS root, per environment
cd infra/terraform
terraform init -backend-config=backend/testnet.hcl    # or staging.hcl / mainnet.hcl
terraform apply -var="environment=testnet"

# Testnet ECS environment
cd infra/testnet
terraform init -backend-config=backend/testnet.hcl
terraform apply

# Staging Kubernetes
cd environments/staging
terraform init -backend-config=backend/staging.hcl
terraform apply
```

## Switching environments

Because the shared root is applied once per environment, always re-initialise
when switching, or Terraform will keep writing to the previously selected key:

```bash
cd infra/terraform
terraform init -reconfigure -backend-config=backend/staging.hcl
```

## Offline validation

`make validate` runs `terraform init -backend=false`, which skips the backend
entirely — no AWS credentials or bucket access are needed to validate or format
the configuration.
