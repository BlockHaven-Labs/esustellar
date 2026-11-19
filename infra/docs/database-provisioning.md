# Database provisioning (#1303)

## Current state: intentional exception — no Terraform RDS module

`infra/secrets/README.md` lists `DATABASE_URL` as a planned Kubernetes secret,
but there is no `infra/terraform/modules/rds` (or any `aws_db_instance` /
`aws_rds_cluster` resource) in this repository. The connection string is
treated as an externally managed input, not as a Terraform-managed resource.

This is an explicit exception to the "all infra is Terraform" rule in
`infra/README.md`, not an oversight to be discovered by grep:

- No application service currently reads `DATABASE_URL` (see the secrets
  inventory), so there is no database to provision for the running app.
- The event indexer is the only future consumer; its storage need is recorded
  in `docs/` and its current backup flow is `infra/backups/backup-indexer.sh`
  writing pg_dump artifacts to S3.
- Providing a Postgres endpoint is therefore the responsibility of the
  environment owner (managed service or external cluster). Terraform does not
  create, rotate or destroy it, and no Terraform output contains its URL.

## Ownership and safety

| Responsibility | Owner |
|---|---|
| Database instance, engine version, backups, network placement | Environment owner (outside this repo) |
| `DATABASE_URL` value and rotation | Kubernetes Secret / SealedSecret in the target cluster; never a Terraform output |
| Backup artifacts from the indexer | `infra/backups/backup-indexer.sh` → S3 bucket exported as `backups_bucket` |
| IAM for workloads that touch S3/KMS | `infra/terraform/modules/iam` (`event_indexer_role_arn`) |

Because the endpoint is external, deleting Terraform state does not delete the
database, and rotating the database password is a secret-rotation task, not a
Terraform apply.

## When to add an RDS module

Add `infra/terraform/modules/rds` when all of the following are true:

1. A service in the repo actually reads `DATABASE_URL`.
2. The environment owner agrees to move lifecycle management into Terraform
   (including maintenance windows, deletion protection and snapshot retention).
3. The module takes `vpc_id` / `private_subnet_ids` from `module.vpc` and a
   security group from the VPC module; no public endpoint.
4. The connection string is written to a secret store (Secrets Manager or a
   SealedSecret), never exposed as a plaintext Terraform output — see the
   sensitive-output audit in `infra/terraform/outputs.tf`.
5. `infra/terraform/README.md`, this document and the secrets inventory are
   updated in the same change.

Until then, do not add a half-wired RDS module just to make the grep pass.
