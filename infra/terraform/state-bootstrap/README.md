# Terraform State Bootstrap

This root creates the **S3 bucket** and **DynamoDB table** used as the remote backend for every other Terraform root in this repository.

| Managed resource | Name (default) | Purpose |
|---|---|---|
| S3 bucket | `esustellar-terraform-state` | Stores all `*.tfstate` files with versioning + SSE-AES256 |
| DynamoDB table | `esustellar-terraform-locks` | State locking so two `apply`s never run concurrently |

These names are defined in `terraform.tfvars.example` and **must not drift** from `../backend.tf` and `../backend-config.tf.example` — otherwise downstream `terraform init` cannot find the bucket/table.

## Chicken-and-egg, explained

The remote backend this root creates *cannot* be used *by* this root during its first run: a Terraform root cannot store its own state in a bucket that does not exist yet.

Therefore **this root is always run with local state first**, and only after the bucket + lock table exist can every other root use the S3 backend.

## Exact bootstrap order

```text
┌────────────────────────────────────────────────────────────────────┐
│ 1. state-bootstrap root  (THIS README)                             │
│    terraform init   →  LOCAL state (terraform.tfstate in ./)      │
│    terraform apply  →  creates S3 bucket + DynamoDB lock table    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. Infra root             infra/terraform/backend.tf               │
│    terraform init -reconfigure                                   │
│    terraform plan / apply  →  S3 backend, bucket "esustellar-     │
│    terraform-state", key "infra/terraform.tfstate"                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. Per-environment roots  (e.g. infra/testnet/backend.tf)          │
│    Each root declares its OWN backend.tf with a distinct key like  │
│    "testnet/terraform.tfstate" (see ../backend-config.tf.example). │
└────────────────────────────────────────────────────────────────────┘
```

### Step 1 — bootstrap with local state (one time per AWS account)

```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars   # review the bucket + lock table names

terraform init            # defaults to LOCAL backend
terraform plan
terraform apply           # creates S3 bucket + DynamoDB table
```

This root is not run again afterwards: it is protected by
`lifecycle { prevent_destroy = true }` on **both** the bucket and the lock
table, so an accidental re-apply/destroy cannot orphan the shared state.

### Step 2 — point the main infra root at S3

`infra/terraform/backend.tf` is the *live* S3 backend used by that root.
Do not edit it; just initialize:

```bash
cd infra/terraform
terraform init -reconfigure     # now talks to S3 + DynamoDB
terraform plan
terraform apply
```

### Step 3 — per-environment roots

Each environment root carries its own `backend.tf` (e.g.
`infra/testnet/backend.tf`, key `testnet/terraform.tfstate`). To add a new
root, copy `../backend-config.tf.example` → `backend.tf` and replace `<ENV>`.

## Which file is used when?

| File | Role |
|---|---|
| `state-bootstrap/` (this root) | One-time local-state bootstrap of bucket + lock table |
| `../backend.tf` | Live S3 backend for the `infra/terraform` root |
| `../backend-config.tf.example` | Copy-paste **template** for new environment roots — never a live `.tf` |

## Optionally migrating this root's own state

After the bucket + table exist you *can* move this root's `terraform.tfstate`
into S3 too (keeps everything consistent):

```bash
# add a backend block (copy ../backend.tf) then:
terraform init -migrate-state
```

Not required for any other root to work.

## Safeguards

- `prevent_destroy = true` on the S3 bucket **and** the DynamoDB table.
- S3 versioning + SSE-AES256 + public-access block already configured.
- Re-running `terraform apply` against an already-bootstrapped account is
  a no-op (resources already exist, unmodified), and `terraform destroy`
  is refused by `prevent_destroy`.