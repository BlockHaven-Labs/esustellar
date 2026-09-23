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

output "upload_bucket_id" {
  description = "ID of the application uploads bucket"
  value       = aws_s3_bucket.uploads.id
}

output "upload_bucket_arn" {
  description = "ARN of the application uploads bucket"
  value       = aws_s3_bucket.uploads.arn
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
