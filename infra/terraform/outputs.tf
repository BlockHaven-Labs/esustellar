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
