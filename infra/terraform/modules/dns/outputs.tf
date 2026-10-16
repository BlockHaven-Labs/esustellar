output "fqdn" {
  description = "Fully qualified domain name for this environment"
  # #1116: aws_route53_record.a only exists when failover is disabled; the
  # failover PRIMARY replaces it when enabled. local.subdomain is identical in
  # both cases and is stable regardless of the toggle.
  value = local.subdomain
}

output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.route53_zone_id
}

output "failover_enabled" {
  description = "Whether this environment is serving a Route53 failover group. When false the plain A/AAAA alias records are authoritative."
  value       = local.failover_enabled
}

output "failover_primary_set_identifier" {
  description = "set_identifier of the failover PRIMARY record (the ALB). Empty when failover is disabled."
  value       = local.failover_enabled ? local.primary_set_identifier : ""
}

output "failover_secondary_set_identifier" {
  description = "set_identifier of the failover SECONDARY record (the maintenance page or recovery region). Empty when failover is disabled."
  value       = local.failover_enabled ? local.secondary_set_identifier : ""
}

output "failover_health_check_id" {
  description = "ID of the Route53 health check gating the failover. Empty when failover is disabled. Needed to disable or retune the failover without recreating the record set."
  value       = local.failover_enabled ? aws_route53_health_check.primary[0].id : ""
}