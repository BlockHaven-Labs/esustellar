# #550: IAM module — least-privilege roles for ECS tasks, CI/CD pipelines,
# and application workloads.
#
# Creates separate roles for:
# - ECS task execution (pull ECR images, push logs)
# - ECS task role (application permissions: S3, KMS, DynamoDB)
# - CI/CD pipeline (ECR push, S3 upload, CloudFront invalidation)

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# --- ECS Execution Role (agent-level permissions) ---

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- ECS Task Role (application-level permissions) ---

data "aws_iam_policy_document" "task_permissions" {
  statement {
    sid    = "S3Access"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
      "s3:DeleteObject",
    ]
    resources = [
      var.s3_bucket_arn,
      "${var.s3_bucket_arn}/*",
    ]
  }

  statement {
    sid    = "KMSDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "task_permissions" {
  name   = "${local.name_prefix}-task-permissions"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.task_permissions.json
}

# --- CI/CD Pipeline Role ---

data "aws_iam_policy_document" "cicd_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com", "codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cicd" {
  name               = "${local.name_prefix}-cicd"
  assume_role_policy = data.aws_iam_policy_document.cicd_assume.json
}

data "aws_iam_policy_document" "cicd_permissions" {
  statement {
    sid    = "ECRAccess"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = var.ecr_repository_arn != "" ? [var.ecr_repository_arn] : ["*"]
  }

  statement {
    sid    = "S3Deploy"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      var.s3_bucket_arn,
      "${var.s3_bucket_arn}/*",
    ]
  }

  statement {
    sid    = "CloudFrontInvalidation"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECSUpdateService"
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cicd_permissions" {
  name   = "${local.name_prefix}-cicd-permissions"
  role   = aws_iam_role.cicd.id
  policy = data.aws_iam_policy_document.cicd_permissions.json
}
