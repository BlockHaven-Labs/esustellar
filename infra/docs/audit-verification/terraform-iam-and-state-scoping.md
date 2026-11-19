# Audit verification: Scaffolding bucket, per-environment state keys, and scoped IAM statements

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1442 — 'Example' S3 bucket

- **Resolution:** The 'Example' framing is gone; the bucket is part of the storage module.
- **Evidence:** `infra/terraform/main.tf:1` (`module "storage"`), `infra/terraform/modules/storage/main.tf` (named buckets, including backups at `:40`); no 'Example' comment remains in `infra/terraform/main.tf`
- **Status:** Satisfied. Whether the uploads bucket is used by an application was not investigated.

## #1443 — hardcoded shared state key

- **Resolution:** The backend block is partial and each environment has its own backend file with a distinct key.
- **Evidence:** `infra/terraform/backend.tf:3-8` (nothing hardcoded; reason), `infra/terraform/backend/{testnet,staging,mainnet}.hcl`, `infra/docs/terraform-state.md:14-22` (key map)
- **Status:** Satisfied.

## #1444 — KMS decrypt on '*'

- **Resolution:** The KMS statement is limited to a key ARN passed as a variable.
- **Evidence:** `infra/terraform/modules/iam/main.tf:122-128` (`sid = "KMSDecrypt"`, `resources = [var.kms_key_arn]`)
- **Status:** Satisfied.

## #1445 — CloudFront invalidation and ECS update on '*'

- **Resolution:** Both statements use ARNs from module inputs.
- **Evidence:** `infra/terraform/modules/iam/main.tf:194-200` (`CloudFrontInvalidation` on `var.cloudfront_distribution_arn`), `:213` (`var.ecs_service_arns`); the comment at `:192` explains the earlier `*`
- **Status:** Satisfied. One `resources = ["*"]` remains at `:235`, on the `ecs:RegisterTaskDefinition`/`DescribeTaskDefinition` statement. That is outside the two statements this issue names and was not changed; those ECS actions generally cannot be restricted to a resource, but that was not confirmed here.

