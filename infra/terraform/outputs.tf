# #997: Sensitive-output audit.
#
# Confirmed 2026-09-24: no connection strings, deployer keys, or other
# secret-adjacent values are exposed as plain Terraform outputs anywhere
# in this repo (root, every module, state-bootstrap, infra/testnet,
# environments/staging). kms_key_arn below is marked sensitive since it
# is used to grant decrypt access to the storage KMS key; every other
# output here is a non-secret identifier (bucket/role/cluster IDs and
# ARNs used only for wiring resources together, not for decryption or
# authentication). Re-run this check whenever a new output is added.

output "aws_region" {
  description = "AWS region in use"
  value       = var.aws_region
}

output "environment" {
  description = "Target environment"
  value       = var.environment
}

output "project_name" {
  description = "Project name prefix"
  value       = var.project_name
}

output "kms_key_arn" {
  description = "ARN of the storage KMS key"
  value       = aws_kms_key.storage.arn
  sensitive   = true
}

output "common_tags" {
  description = "Common resource tags shared with per-environment roots"
  value       = local.common_tags
}

output "vpc_id" {
  description = "ID of the shared VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the shared private subnets (usable by Fargate tasks)"
  value       = aws_subnet.private[*].id
}
