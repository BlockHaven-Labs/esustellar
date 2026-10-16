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
  description = "Deployment environment for resource tagging. Also selects the permitted price_class (see price_class)."
  type        = string

  validation {
    condition     = contains(["testnet", "staging", "mainnet"], var.environment)
    error_message = "environment must be one of: testnet, staging, mainnet."
  }
}

# #1114: recommended value per environment.
#
# CloudFront bills per request above a monthly free tier, and which requests
# count is decided by which edge locations the distribution uses:
#
#   PriceClass_100 — edge locations in North America (US and Canada) only.
#   PriceClass_200 — PriceClass_100 plus Europe, Asia, South America, Middle
#                    East, Africa, Japan.
#   PriceClass_All  — every CloudFront edge location worldwide.
#
# Recommended per environment:
#
#   mainnet   PriceClass_All   Real users are distributed globally, so the
#                             global edge is the point of using CloudFront.
#   staging   PriceClass_100   Staging has a handful of internal testers; the
#                             extra POPs cost requests without serving anyone.
#   testnet   PriceClass_100   Same reasoning as staging.
#
# This default (PriceClass_100) is therefore the safe choice: a root that forgets
# to set price_class gets the restricted class, not an expensive one. Only
# mainnet should raise it, and it must be set per Terraform root rather than
# shared — the four roots (infra/terraform, infra/testnet,
# environments/testnet, environments/staging) are independent state, so a single
# value cannot be "shared" across them even if one is attempted.
#
# main.tf additionally carries a precondition that rejects PriceClass_All and
# PriceClass_200 for any environment other than mainnet, so an over-broad value
# fails the apply rather than quietly billing.
#
# Note: this cost is invisible to `infracost.yml` unless the CDN module is
# instantiated by a Terraform root that infracost scans.
variable "price_class" {
  description = "CloudFront distribution price class (which edge locations serve requests and are billed). Per-environment recommendation: mainnet PriceClass_All; staging and testnet PriceClass_100 (the default)."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition = contains([
      "PriceClass_100",
      "PriceClass_200",
      "PriceClass_All",
    ], var.price_class)
    error_message = "price_class must be one of PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

# #1113: cache invalidation coordination with the k8s rollout.
#
# Set this to true when the deploy pipeline performs a wildcard invalidation
# after each Kubernetes rollout. The module then exposes `distribution_id` and
# the invalidation command in an output so the pipeline can reference them from
# state instead of a hardcoded distribution id. Keeping the flag here means the
# expectation is declared alongside the TTLs it compensates for rather than only
# in a runbook that can drift from the configuration.
variable "invalidate_cache_on_deploy" {
  description = "Whether the deploy pipeline invalidates this distribution's cache after each rollout. Recorded in state and surfaced as an output so the pipeline can confirm invalidation is wired up. See infra/scripts/invalidate-cdn-cache.sh."
  type        = bool
  default     = false
}