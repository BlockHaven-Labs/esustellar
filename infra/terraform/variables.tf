variable "aws_region" {
  description = "AWS region for infrastructure resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (testnet, staging, mainnet)"
  type        = string

  validation {
    condition     = contains(["testnet", "staging", "mainnet"], var.environment)
    error_message = "Environment must be one of: testnet, staging, mainnet."
  }
}

variable "project_name" {
  description = "Project name prefix used for resource naming"
  type        = string
  default     = "esustellar"
}

variable "enable_logging" {
  description = "Enable audit logging (VPC flow logs, access logs)"
  type        = bool
  default     = true
}

variable "allowed_ingress_cidrs" {
  description = "List of CIDR blocks allowed to access public resources"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
