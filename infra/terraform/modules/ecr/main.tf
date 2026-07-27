# #552: ECR module — container registry with lifecycle policies,
# vulnerability scanning, and cross-account pull permissions.

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  repos       = ["savings", "registry"]
}

resource "aws_ecr_repository" "this" {
  for_each             = toset(local.repos)
  name                 = "${local.name_prefix}-${each.key}"
  image_tag_mutability = var.image_tag_mutability
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Lifecycle policy: retain only latest N images, expire untagged after 7 days
resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only latest ${var.max_image_count} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# --- Cross-account pull policy for shared registries ---
# Allows specified accounts to pull images (for staging -> mainnet promotion)

data "aws_iam_policy_document" "cross_account_pull" {
  count = length(var.allowed_account_ids) > 0 ? 1 : 0

  statement {
    sid    = "CrossAccountPull"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [for id in var.allowed_account_ids : "arn:aws:iam::${id}:root"]
    }
    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:GetAuthorizationToken",
    ]
  }
}

variable "allowed_account_ids" {
  description = "AWS account IDs allowed to pull images cross-account"
  type        = list(string)
  default     = []
}

data "aws_caller_identity" "current" {}

resource "aws_ecr_repository_policy" "cross_account" {
  for_each   = length(var.allowed_account_ids) > 0 ? aws_ecr_repository.this : {}
  repository = each.value.name
  policy     = data.aws_iam_policy_document.cross_account[0].json
}
