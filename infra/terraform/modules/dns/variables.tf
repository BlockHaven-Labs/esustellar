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
  description = "ALB DNS name for A/AAAA alias records"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID for alias records"
  type        = string
}
