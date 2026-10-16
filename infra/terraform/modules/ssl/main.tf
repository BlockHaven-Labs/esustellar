# #549: SSL module — ACM certificate with DNS validation via Route53.
#
# Provides TLS certificates validated automatically through DNS,
# suitable for ALB and CloudFront distribution use.
#
# Ordering caveat (#1115): ACM DNS validation records are a well-known source
# of failed applies and, in the worst case, TLS downtime, because the
# certificate and its records are recreated independently. The lifecycle blocks
# on aws_acm_certificate.this, aws_route53_record.validation and
# aws_acm_certificate_validation.this below are load-bearing — removing them
# reintroduces the footgun described at the validation records.

resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# #1115: the ACM validation records are the classic Terraform footgun.
#
# The certificate carries create_before_destroy = true, so a change to
# domain_name or subject_alternative_names replaces the certificate *before*
# destroying the old one. If the corresponding validation records were destroyed
# first, ACM would have nothing to validate the new certificate against: the
# apply hangs or fails with "Could not find host" / a DNS timeout, and in the
# worst case the old certificate is already gone, taking TLS down with it.
#
# Two things prevent that ordering here:
#   1. create_before_destroy on the records themselves, so a replacement record
#      exists before its predecessor is removed.
#   2. depends_on the certificate, so the records are (re)written as part of the
#      same change that produces the certificate rather than racing it.
#
# aws_acm_certificate_validation below references record.fqdn, which already
# creates an implicit ordering edge; the explicit depends_on additionally covers
# the case where validation is disabled by the caller.
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_acm_certificate.this]
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]

  lifecycle {
    # Same reasoning as the records: never tear down the validation before the
    # replacement certificate is validated, or ACM re-checks a certificate
    # whose records have already been removed.
    create_before_destroy = true
  }

  depends_on = [aws_route53_record.validation]
}
