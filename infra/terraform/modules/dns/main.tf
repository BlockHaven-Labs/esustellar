# #547: DNS module — Route53 records for the application.
#
# Creates alias records pointing at the ALB for each environment subdomain.
# Supports A and AAAA alias records (IPv6 dual-stack ready).
#
# Failover (#1116): evaluate_target_health = true makes Route53 stop returning
# an unhealthy ALB — but "stop returning it" means no answer at all. Resolvers
# then hand the visitor NXDOMAIN/SERVFAIL, so a total ALB outage becomes a
# visible error page rather than a graceful degradation. The optional failover
# record set below pairs a health-checked PRIMARY with a SECONDARY pointing at a
# static maintenance page, which is what makes the degrade path graceful.
#
# Route53 constraint that shapes this file: a failover group must contain both a
# PRIMARY and a SECONDARY, and every member needs a unique set_identifier. So
# enabling failover is not purely additive — the plain A/AAAA records have to
# become PRIMARY members of the same failover group, otherwise AWS rejects the
# apply with "InvalidChangeBatch: Tried to create resource record set ... but it
# already exists". The counts below therefore switch the two representations
# rather than adding a second one on top:
#
#   enable_failover = false -> aws_route53_record.a / .aaaa (plain, unchanged)
#   enable_failover = true  -> aws_route53_record.primary_a / .primary_aaaa
#                             (failover PRIMARY) + .failover_secondary_a /
#                             .failover_secondary_aaaa (failover SECONDARY)
#
# Switching enable_failover on is therefore a one-time destructive replace of the
# record set. That is why it defaults to false; turn it on per environment
# deliberately, and expect the records to be recreated.

locals {
  subdomain = "${var.environment}.${var.domain_name}"

  primary_set_identifier   = "${var.environment}-primary"
  secondary_set_identifier = "${var.environment}-secondary"

  # A failover group needs both halves; without a secondary target there is
  # nothing to fail over to, so the option is treated as off.
  failover_enabled = var.enable_failover && var.failover_dns_name != ""
}

# --- Health check driving the failover decision ---
#
# Without a health check attached, Route53 has no signal to act on, and a
# failover record whose primary is never marked unhealthy never hands over. The
# check targets the ALB health endpoint and polls slowly on purpose: this is a
# last-resort disaster path, not a load-balancing signal. A fast poller here
# would fail over on a single blip and send real users to a maintenance page.
resource "aws_route53_health_check" "primary" {
  count = local.failover_enabled ? 1 : 0

  fqdn              = var.alb_dns_name
  port              = 443
  type              = "HTTPS_STR_MATCH"
  resource_path     = var.health_check_path
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = false

  tags = {
    Name = "${local.subdomain}-primary"
  }
}

# --- Plain records (failover disabled) ---

resource "aws_route53_record" "a" {
  count = local.failover_enabled ? 0 : 1

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
  count = local.failover_enabled ? 0 : 1

  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "AAAA"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# --- Primary: the ALB (failover enabled) ---

resource "aws_route53_record" "primary_a" {
  count = local.failover_enabled ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "A"

  set_identifier  = local.primary_set_identifier
  failover_rrole  = "PRIMARY"
  health_check_id = aws_route53_health_check.primary[0].id

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "primary_aaaa" {
  count = local.failover_enabled ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "AAAA"

  set_identifier  = local.primary_set_identifier
  failover_rrole  = "PRIMARY"
  health_check_id = aws_route53_health_check.primary[0].id

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# --- Secondary: static maintenance page or second region ---
#
# A SECONDARY is only returned while the PRIMARY is unhealthy, so these records
# never serve normal traffic. failover_dns_name is either the website endpoint of
# a bucket holding a maintenance page, or the name of a second ALB in a recovery
# region — both are valid targets. failover_zone_id only needs to differ from the
# primary's when the secondary lives in a different hosted zone (a different
# region); it is optional for the common same-zone maintenance-page case.
resource "aws_route53_record" "failover_secondary_a" {
  count = local.failover_enabled ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "A"

  set_identifier  = local.secondary_set_identifier
  failover_rrole  = "SECONDARY"
  health_check_id = aws_route53_health_check.primary[0].id

  alias {
    name                   = var.failover_dns_name
    zone_id                = var.failover_zone_id != "" ? var.failover_zone_id : var.alb_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "failover_secondary_aaaa" {
  count = local.failover_enabled ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.subdomain
  type    = "AAAA"

  set_identifier  = local.secondary_set_identifier
  failover_rrole  = "SECONDARY"
  health_check_id = aws_route53_health_check.primary[0].id

  alias {
    name                   = var.failover_dns_name
    zone_id                = var.failover_zone_id != "" ? var.failover_zone_id : var.alb_zone_id
    evaluate_target_health = false
  }
}