output "namespace" {
  description = "The staging namespace name"
  value       = kubernetes_namespace.staging.metadata[0].name
}

output "config_map" {
  description = "The staging application config map name"
  value       = kubernetes_config_map.app_config.metadata[0].name
}

output "web_replicas" {
  description = "Configured web replica count for staging"
  value       = var.web_replicas
}
