# Audit verification: Restore procedure, backup bucket, Grafana workflow and Prometheus kustomization

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1325 — restore procedure in the backups README

- **Resolution:** The README documents restore steps and a restore drill.
- **Evidence:** `infra/backups/README.md:13` (Restore Procedure), `:18-` (numbered steps), `:114-120` (Restore Drill, 'An untested restore procedure is an assumption')
- **Status:** Partly satisfied. The procedure and drill are documented. This verification did not run a restore against a real backup, so the issue's 'tested at least once' criterion still needs an operator to run the drill and record the result.

## #1326 — Terraform resource for the backups bucket

- **Resolution:** The bucket is declared in the shared storage module with versioning and encryption.
- **Evidence:** `infra/terraform/modules/storage/main.tf:40-41` (`aws_s3_bucket.backups`, `${local.name_prefix}-backups`), `:45-` (versioning), `:52-` (server-side encryption); `infra/terraform/outputs.tf:50-56` (`backups_bucket`, `backups_bucket_uri`)
- **Status:** Satisfied. The generated name must match the `BACKUP_BUCKET` the script uses; `outputs.tf` documents that.

## #1327 — Grafana dashboard workflow

- **Resolution:** A README documents the edit-JSON-commit workflow.
- **Evidence:** `infra/monitoring/grafana/dashboards/README.md:1` (title), `:7` (why UI edits are lost), `:26` (The required workflow), `:65` (Adding a dashboard)
- **Status:** Satisfied.

## #1328 — Prometheus kustomization reaching out of tree

- **Resolution:** `balance-exporter.yaml` lives beside the kustomization and every resource path is local.
- **Evidence:** `infra/monitoring/prometheus/kustomization.yaml` (resources list and the #1122 comment), `infra/monitoring/prometheus/balance-exporter.yaml`
- **Status:** Satisfied.

