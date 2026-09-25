# Regional Outage Disaster Recovery Runbook

**Scope:** a full `us-east-1` outage affecting the Terraform-provisioned
infrastructure (Terraform state backend, VPC, ECR, CDN, DNS, EKS/ECS).

## Impact
Terraform state (`infra/terraform/backend.tf`) and all provisioned
AWS resources are single-region in `us-east-1`. An extended outage
there blocks both the running infrastructure and the ability to run
`terraform apply` to recover it.

## Targets
- **RTO (Recovery Time Objective):** 4 hours to restore read access to
  user funds/balances (savings contract state lives on-chain via
  Soroban RPC, not solely in `us-east-1`, which limits blast radius).
- **RPO (Recovery Point Objective):** 15 minutes, bounded by the most
  recent database backup per `infra/backups/backup-indexer.sh`.

## Recovery steps
1. Confirm Soroban RPC/contract state is unaffected (on-chain, not
   region-pinned) — user funds remain safe regardless of AWS status.
2. Stand up a parallel Terraform state bucket + backend in a secondary
   region (e.g. `us-west-2`) from the latest state backup.
3. Re-apply Terraform modules against the secondary region.
4. Restore the most recent database backup (see
   `infra/backups/README.md`) into the new region.
5. Update DNS to point at the recovered stack.

## Follow-up
Evaluate cross-region state bucket replication so step 2 doesn't
depend on a manual backup restore during an active incident.
