output "environment" {
  value = "testnet"
}

output "ecs_cluster_arn" {
  value = module.shared.ecs_cluster_arn
}
