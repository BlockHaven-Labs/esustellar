# #548: CDN module — CloudFront distribution with origin access to ALB.
#
# Provides edge caching, TLS termination, and geo-restriction capability
# for static and dynamic content served through the application.

# #1114: price_class selects which CloudFront edge locations serve this
# distribution, and it is billed per-request above a free tier. A single global
# value across all four Terraform roots means testnet and staging pay for edge
# POPs no testnet user ever hits. The precondition below fails the apply rather
# than letting an expensive class reach a non-production root silently: pass
# PriceClass_100 (US/Canada edge locations only) for testnet/staging and
# PriceClass_All only for mainnet. See variables.tf for the per-environment
# recommendation.
locals {
  price_class_permitted = var.environment == "mainnet" ? [
    "PriceClass_All",
    "PriceClass_200",
    "PriceClass_100",
    ] : [
    "PriceClass_100",
  ]
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "" # Empty: Next.js app handles routing server-side via ALB origin; no static index.html at root
  price_class         = var.price_class
  aliases             = [var.domain_name]

  # #1113: the distribution caches hashed build assets (default_ttl 3600 /
  # max_ttl 86400). A deploy that ships new hashed filenames does not change
  # those URLs, so already-cached copies of the previous build's assets remain
  # reachable at the edge until the TTL expires — up to 24h for a path someone
  # links to directly. The deploy runbook therefore invalidates the cache after
  # each rollout; see infra/scripts/invalidate-cdn-cache.sh and docs/deployment.md.
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = var.origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host", "Origin"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  origin {
    domain_name = var.origin_domain_name
    origin_id   = var.origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = ""
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Project     = "esustellar"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    precondition {
      condition     = contains(local.price_class_permitted, var.price_class)
      error_message = "price_class '${var.price_class}' is not permitted for environment '${var.environment}'. Use PriceClass_100 (edge locations in the US/Canada only) for testnet and staging; only mainnet may use PriceClass_All or PriceClass_200."
    }
  }
}