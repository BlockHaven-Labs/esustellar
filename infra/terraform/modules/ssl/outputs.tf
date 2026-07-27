output "certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate.this.arn
}

output "domain_validation_records" {
  description = "Route53 validation records for each domain"
  value       = aws_route53_record.validation
}
