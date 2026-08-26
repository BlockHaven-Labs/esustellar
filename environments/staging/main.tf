terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }



  
}

provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

# Staging mirrors production at reduced scale for integration testing.
resource "kubernetes_namespace" "staging" {
  metadata {
    name = var.namespace

    labels = {
      environment = "staging"
      app         = "esustellar"
      managed-by  = "terraform"
    }
  }
}

# Non-secret application configuration for the staging deployment.
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "esustellar-config"
    namespace = kubernetes_namespace.staging.metadata[0].name
  }

  data = {
    STELLAR_NETWORK            = var.stellar_network
    STELLAR_NETWORK_PASSPHRASE = var.stellar_network_passphrase
    SOROBAN_RPC_URL            = var.soroban_rpc_url
    REPLICAS                   = tostring(var.web_replicas)
  }
}
