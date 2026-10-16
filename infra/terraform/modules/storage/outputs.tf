output "common_tags" {
  description = "Common resource tags for the environment"
  value = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "kms_key_arn" {
  description = "ARN of the storage KMS key"
  value       = aws_kms_key.storage.arn
}

output "backups_bucket" {
  description = "Name of the S3 bucket holding database backups"
  value       = aws_s3_bucket.backups.id
}
