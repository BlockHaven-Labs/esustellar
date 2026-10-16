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

The bootstrap root has no remote backend block. Its first `terraform init`
therefore uses the local backend and writes state to
`state-bootstrap/terraform.tfstate`. Apply it once to create the bucket and
lock table:

```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Keep the local state file safe; it contains the Terraform tracking information
for the bucket and lock table. Moving this root's state to S3 is optional and
is not required for any other root to use remote state.

## After the bucket exists

The shared root in `infra/terraform` has a live, partial S3 backend block in
`backend.tf`. Initialize it with the matching per-environment HCL file, which
supplies the bucket, region, lock table, and distinct state key:

```bash
cd infra/terraform
terraform init -reconfigure -backend-config=backend/testnet.hcl
terraform plan
terraform apply
```

Use `backend/staging.hcl` or `backend/mainnet.hcl` for those environments.
Each config selects its own state key. The `-reconfigure` flag configures this
root to use S3; it does not migrate the state belonging to `state-bootstrap/`.

`backend-config.tf.example` is not a live configuration file and is not loaded
by Terraform. It is a template for a new root: copy it to that root as
`backend.tf`, then set its environment-specific state key. The current shared
root instead uses `backend.tf` together with `backend/<env>.hcl` at init time.

See [the Terraform state map](../../docs/terraform-state.md) for the keys used
by repository roots.

## Optional migration of the bootstrap root

To store the bootstrap root's own state in S3, add an S3 backend block to this
root after the bucket and lock table exist, then run `terraform init
-migrate-state` with the desired backend configuration. This is optional; the
normal bootstrap sequence leaves this root's state local.

## Safeguards

- `prevent_destroy = true` protects the bucket and lock table.
- The bucket has versioning, server-side encryption, and public-access blocks.
