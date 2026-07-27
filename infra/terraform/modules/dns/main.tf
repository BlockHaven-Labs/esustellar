# #547: DNS module — Route53 records for the application.
#
# Creates alias records pointing at the ALB for each environment subdomain.
# Supports A and AAAA alias records (IPv6 dual-stack ready).

locals {
  subdomain = "${var.environment}.${var.domain_name}"
}

resource "aws_route53_record" "a" {
  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "aaaa" {
  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "AAAA"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
