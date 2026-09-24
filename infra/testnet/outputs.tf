# Environment metadata for the testnet root.
#
# NOTE: `ecs_cluster_arn` is intentionally defined in main.tf (referencing the
# aws_ecs_service resource) and is NOT repeated here.
# #997: audited 2026-09-24, see infra/terraform/outputs.tf header, no secret-adjacent outputs here.
output "environment" {
  value = "testnet"
}