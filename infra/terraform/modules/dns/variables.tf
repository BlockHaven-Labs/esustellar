variable "domain_name" {
  description = "Root domain name (e.g. esustellar.com)"
  type        = string
}

variable "environment" {
  description = "Deployment environment for DNS record naming"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name for A/AAAA alias records, and the target of the failover health check"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID for alias records"
  type        = string
}

# #1116 — failover.
#
# evaluate_target_health = true on the primary alias means Route53 stops
# returning an unhealthy ALB, but it does not then return anything else: the
# visitor gets NXDOMAIN/SERVFAIL. Pairing a health-checked PRIMARY with a
# SECONDARY is what turns a total ALB outage into a maintenance page instead of
# an error.
#
# Both defaults are false/empty, so existing instantiations are unaffected and
# the failover set is opt-in per environment.

variable "enable_failover" {
  description = "Create a Route53 failover record pair (health-checked PRIMARY + SECONDARY) instead of plain alias records. Only effective when failover_dns_name is also set. Turning this on replaces the existing A/AAAA records, because Route53 requires every failover group member to carry a set_identifier."
  type        = bool
  default     = false
}

variable "failover_dns_name" {
  description = "Target of the failover SECONDARY record: the website endpoint of a bucket hosting a maintenance page, or the ALB name of a recovery-region deployment. Required when enable_failover is true; ignored otherwise."
  type        = string
  default     = ""
}

variable "failover_zone_id" {
  description = "Route53 hosted zone ID of the failover target, needed only when it lives in a different hosted zone (for example a recovery region). Defaults to the primary ALB's zone."
  type        = string
  default     = ""
}

variable "health_check_path" {
  description = "HTTPS path the failover health check requests from the ALB. Must return a body containing the match string configured by Route53."
  type        = string
  default     = "/api/health"
}