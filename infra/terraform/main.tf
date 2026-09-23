locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# KMS key for storage encryption (S3, EBS volumes, etc.)
resource "aws_kms_key" "storage" {
  description             = "KMS key for ${local.name_prefix} storage encryption"
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "storage" {
  name          = "alias/${local.name_prefix}-storage"
  target_key_id = aws_kms_key.storage.key_id
}
