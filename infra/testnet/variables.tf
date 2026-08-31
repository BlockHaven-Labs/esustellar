variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "esustellar"
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed to access the web app"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "stellar_rpc_url" {
  description = "Stellar testnet RPC endpoint URL"
  type        = string
  default     = "https://soroban-testnet.stellar.org"
}

variable "web_image" {
  description = "Docker image for the web app"
  type        = string
  default     = "esustellar/web:latest"
}
