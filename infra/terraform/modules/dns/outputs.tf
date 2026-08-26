output "fqdn" {
  description = "Fully qualified domain name for this environment"
  value       = aws_route53_record.a.name
}

output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.route53_zone_id
}
