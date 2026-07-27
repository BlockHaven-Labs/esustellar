variable "domain_name" {
  description = "Domain name to associate with the CloudFront distribution"
  type        = string
}

variable "origin_domain_name" {
  description = "ALB or S3 origin domain name"
  type        = string
}

variable "origin_id" {
  description = "Unique origin identifier"
  type        = string
  default     = "alb-origin"
}

variable "environment" {
  description = "Deployment environment for resource tagging"
  type        = string
}

variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
}
