variable "domain_name" {
  description = "Root domain name for the ACM certificate"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS validation"
  type        = string
}

variable "environment" {
  description = "Deployment environment for resource tagging"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional domain names to include in the certificate"
  type        = list(string)
  default     = []
}
