# #997: audited 2026-09-24, see infra/terraform/outputs.tf header, no secret-adjacent outputs here.

output "environment" {
  value = "testnet"
}

output "ecs_cluster_arn" {
  value = module.shared.ecs_cluster_arn
}
