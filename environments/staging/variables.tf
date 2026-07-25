variable "namespace" {
  description = "Kubernetes namespace for the staging environment"
  type        = string
  default     = "esustellar-staging"
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "kubeconfig context to target"
  type        = string
  default     = "staging"
}

variable "web_replicas" {
  description = "Number of web replicas (reduced scale for staging)"
  type        = number
  default     = 2
}

variable "stellar_network" {
  description = "Stellar network name used by staging"
  type        = string
  default     = "testnet"
}

variable "stellar_network_passphrase" {
  description = "Stellar network passphrase"
  type        = string
  default     = "Test SDF Network ; September 2015"
}

variable "soroban_rpc_url" {
  description = "Soroban RPC endpoint"
  type        = string
  default     = "https://soroban-testnet.stellar.org"
}
