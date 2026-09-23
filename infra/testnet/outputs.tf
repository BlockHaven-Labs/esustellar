# Environment metadata for the testnet root.
#
# NOTE: `ecs_cluster_arn` is intentionally defined in main.tf (referencing the
# aws_ecs_service resource) and is NOT repeated here.
output "environment" {
  value = "testnet"
}