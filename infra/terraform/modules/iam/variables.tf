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
