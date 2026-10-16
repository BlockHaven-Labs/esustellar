output "distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.this.id
}

# #1113: the distribution's own domain name. The invalidate script prefers this
# over `aliases` because it is stable and does not change when the domain is
# re-pointed.
output "distribution_domain_name" {
  description = "CloudFront distribution domain name (dxxxx.cloudfront.net), suitable for `aws cloudfront create-invalidation --distribution-id`"
  value       = aws_cloudfront_distribution.this.domain_name
}

# #1113: the value the deploy pipeline's invalidation step expects, so a
# misconfigured pipeline can be detected by comparing it against what the
# pipeline actually does rather than by noticing stale assets in production.
output "invalidation_required" {
  description = "Whether this environment expects a cache invalidation after each deploy. If this is true but the deploy pipeline does not run infra/scripts/invalidate-cdn-cache.sh, users will be served a mix of old and new build assets until default_ttl expires."
  value       = var.invalidate_cache_on_deploy
}

# #1113: the exact command to run after a rollout, assembled from this module's
# own outputs so no distribution id has to be hardcoded anywhere.
output "invalidation_command" {
  description = "Command to invalidate everything in this distribution, to be run after each k8s rollout"
  value = var.invalidate_cache_on_deploy ? format(
    "aws cloudfront create-invalidation --distribution-id %s --paths '/*' --wait",
    aws_cloudfront_distribution.this.id,
  ) : ""
}

output "domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.this.arn
}