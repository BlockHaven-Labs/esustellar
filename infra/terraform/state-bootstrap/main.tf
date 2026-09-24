# #1000: Guarantee that this root can never destroy the remote state
# infrastructure that every downstream root (infra/terraform, infra/testnet,
# ...) depends on.
#
# Both the S3 bucket and the DynamoDB lock table carry
# `lifecycle { prevent_destroy = true }`. If these resources are ever
# deleted/recreated, every other root's remote state (*.tfstate) and its
# locking are orphaned. `terraform destroy` on this root therefore fails
# loudly instead of silently wiping shared state.

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = var.tags
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # See header comment: never allow the lock table to be destroyed.
  lifecycle {
    prevent_destroy = true
  }

  tags = var.tags
}
