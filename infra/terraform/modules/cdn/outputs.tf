output "distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.this.id
}

output "domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.this.arn
}
