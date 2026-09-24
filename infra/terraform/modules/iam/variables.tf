variable "environment" {
  description = "Deployment environment for IAM resource naming"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for IAM resources"
  type        = string
  default     = "esustellar"
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for application uploads"
  type        = string
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository for container images"
  type        = string
  default     = ""
}

# #991: required so the ECS task role can never be granted kms:Decrypt on "*".
# Pass the ARN of the storage key created in infra/terraform/main.tf
# (`aws_kms_key.storage.arn`).
variable "kms_key_arn" {
  description = "ARN of the KMS key the ECS task may decrypt with (storage encryption key)"
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-zA-Z-]*:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be a full KMS key ARN (arn:aws:kms:...); wildcards are not allowed."
  }
}
