variable "project_name" {
  description = "Project name prefix for VPC resources"
  type        = string
  default     = "esustellar"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs to CloudWatch"
  type        = bool
  default     = true
}

# #1112: consumed by the ALB security group below and exported in outputs.tf.
variable "application_port" {
  description = "TCP port the application listens on (matches containerPort 3000 in infra/k8s/base/deployment.yaml)"
  type        = number
  default     = 3000

  validation {
    condition     = var.application_port > 0 && var.application_port < 65536
    error_message = "application_port must be a valid TCP port (1-65535)."
  }
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks permitted to reach the ALB on ports 80/443. Widen deliberately — 0.0.0.0/0 is the public default, not an oversight."
  type        = list(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition     = length(var.allowed_ingress_cidrs) > 0
    error_message = "allowed_ingress_cidrs must contain at least one CIDR block."
  }
}

variable "domain_suffix" {
  description = "Domain served by the ALB, used in the security group description only"
  type        = string
  default     = "esustellar.io"
}
