# Terraform State Bootstrap

This Terraform root creates the S3 bucket and DynamoDB table used for remote
state by the other Terraform roots in this repository.

| Resource | Default name | Purpose |
|---|---|---|
| S3 bucket | `esustellar-terraform-state` | Stores versioned, encrypted Terraform state |
| DynamoDB table | `esustellar-terraform-locks` | Coordinates state locking |

The names are configured in `terraform.tfvars.example` and must match the
backend configuration used by downstream roots.

## Bootstrap order

The bootstrap root has no `backend` block, so `terraform init` uses Terraform's
local backend and writes state to `state-bootstrap/terraform.tfstate`. Apply it
once to create the bucket and lock table:

```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Keep the local state file safe; it contains the Terraform tracking information
for the bucket and lock table. This root remains on local state in the normal
workflow; it is not automatically migrated to S3.

## After the bucket exists

After bootstrap succeeds, the separate shared root in `infra/terraform` uses
the live partial S3 backend block in `backend.tf`. At `terraform init`, pass
the matching `backend/<env>.hcl` file; it supplies the bucket, region, lock
table, and distinct state key:

```bash
cd infra/terraform
terraform init -reconfigure -backend-config=backend/testnet.hcl
terraform plan
terraform apply
```

Use `backend/staging.hcl` or `backend/mainnet.hcl` for those environments.
Each config selects its own state key. `-reconfigure` configures this shared
root to use S3; it does not migrate or otherwise change the local state
belonging to `state-bootstrap/`.

There is no live `backend-config.tf` in either root. The similarly named
`infra/terraform/backend-config.tf.example` is only a template for a new root:
it is not loaded by Terraform and is not part of this bootstrap or migration
sequence. The shared root instead uses `infra/terraform/backend.tf` together
with `infra/terraform/backend/<env>.hcl` at init time.

See [the Terraform state map](../../docs/terraform-state.md) for the keys used
by repository roots.

## Optional migration of the bootstrap root

To store the bootstrap root's own state in S3, add an S3 backend block to this
root after the bucket and lock table exist, then run `terraform init
-migrate-state` with the desired backend configuration. This is optional; the
normal bootstrap sequence leaves this root's state local.

## Safeguards

- `prevent_destroy = true` protects the bucket and lock table from a Terraform
  destroy or a replacement while they are tracked in this root's state.
- The bucket has versioning, server-side encryption, and public-access blocks.

Do not treat this root as safe to initialize from scratch against an account
that already has the named resources. Keep and back up the local
`terraform.tfstate`: `prevent_destroy` cannot associate existing AWS resources
with a missing local state file. With an empty state, Terraform will plan to
create the resources again, and AWS will reject the duplicate names rather than
adopting or safely managing them. Stop if that happens; restore the state file
from backup or import the existing resources before applying:

```bash
terraform import aws_s3_bucket.terraform_state <state-bucket-name>
terraform import aws_dynamodb_table.terraform_locks <lock-table-name>
terraform plan
```

Review the plan before applying, including any separately managed bucket
configuration resources.
The full chain from this root through the other Terraform roots, the k8s
overlays and monitoring is documented in
[the bootstrap apply order](../../README.md#bootstrap-apply-order-1305).
