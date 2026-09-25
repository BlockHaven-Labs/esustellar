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

# #992: required so the CI/CD role is never granted CloudFront or ECS
# permissions on "*". Pass the ARNs of this project's own resources.
variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution the CI/CD role may invalidate"
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-zA-Z-]*:cloudfront::", var.cloudfront_distribution_arn))
    error_message = "cloudfront_distribution_arn must be a full CloudFront distribution ARN; wildcards are not allowed."
  }
}

variable "ecs_cluster_arn" {
  description = "ARN of the ECS cluster the CI/CD role may deploy into"
  type        = string

  validation {
    condition     = can(regex("^arn:aws[a-zA-Z-]*:ecs:", var.ecs_cluster_arn))
    error_message = "ecs_cluster_arn must be a full ECS cluster ARN; wildcards are not allowed."
  }
}

variable "ecs_service_arns" {
  description = "ARNs of the ECS services the CI/CD role may update"
  type        = list(string)

  validation {
    condition     = length(var.ecs_service_arns) > 0
    error_message = "ecs_service_arns must list at least one ECS service ARN."
  }

  validation {
    condition     = alltrue([for arn in var.ecs_service_arns : can(regex("^arn:aws[a-zA-Z-]*:ecs:", arn))])
    error_message = "Every entry in ecs_service_arns must be a full ECS service ARN; wildcards are not allowed."
  }
}
