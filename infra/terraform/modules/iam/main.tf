# #550: IAM module — least-privilege roles for ECS tasks, CI/CD pipelines,
# and application workloads.
#
# Creates separate roles for:
# - ECS task execution (pull ECR images, push logs, read task-definition secrets)
# - ECS task role (application permissions: S3, KMS, DynamoDB)
# - CI/CD pipeline (ECR push, S3 upload, CloudFront invalidation)

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # #1124: only render the secret-injection policy when the caller actually
  # declared secrets/parameters to read.
  ecs_execution_secrets_policy_enabled = length(var.secretsmanager_secret_arns) > 0 || length(var.ssm_parameter_arns) > 0 ? 1 : 0
}

# --- ECS Execution Role (agent-level permissions) ---
#
# #1124 — secret injection on the ECS path.
#
# The AWS managed AmazonECSTaskExecutionRolePolicy does already grant
# secretsmanager:GetSecretValue / GetSecretValueBatch and
# ssm:GetParameters / GetParametersByPath / GetParameter — but on
# resources = ["*"], i.e. every secret and every parameter in the account. That
# satisfies the agent's functionality while violating the least-privilege
# contract this module's own header comment claims. The statements below grant
# the same actions explicitly, scoped to the exact secret/parameter ARNs the
# caller declares.
#
# Which mechanism is in use where:
#   - Kubernetes (the live deployment target, see infra/README.md) injects
#     secrets via **Sealed Secrets** — the kubelet reads a decrypted Secret from
#     the API server and no AWS-side role is involved at all.
#   - ECS injects secrets via the task definition's `secrets:` /
#     `valueFrom:` blocks, which are resolved by the **execution role** at
#     container start. That is the only path this module's statements apply to.
#
# Both lists default to empty, so an instantiation that needs no ECS secret
# injection gets no additional permissions. Pass the specific ARNs to grant.

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

data "aws_iam_policy_document" "ecs_execution_secrets" {
  # Only rendered when the caller has actually declared secrets to read, so a
  # module instantiation without ECS secret injection creates no extra policy.
  count = length(var.secretsmanager_secret_arns) > 0 || length(var.ssm_parameter_arns) > 0 ? 1 : 0

  dynamic "statement" {
    for_each = length(var.secretsmanager_secret_arns) > 0 ? [1] : []
    content {
      sid    = "SecretsManagerRead"
      effect = "Allow"
      actions = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ]
      resources = var.secretsmanager_secret_arns
    }
  }

  dynamic "statement" {
    for_each = length(var.ssm_parameter_arns) > 0 ? [1] : []
    content {
      sid    = "SSMParameterRead"
      effect = "Allow"
      actions = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ]
      resources = var.ssm_parameter_arns
    }
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  count  = local.ecs_execution_secrets_policy_enabled
  name   = "${local.name_prefix}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets[0].json
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

  # #991: scoped to the single storage KMS key rather than "*" — a wildcard
  # here would let the task decrypt every key in the account.
  statement {
    sid    = "KMSDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]
    resources = [var.kms_key_arn]
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

  # #992: scoped to this project's distribution instead of "*", which allowed
  # the CI/CD role to invalidate any distribution in the account.
  statement {
    sid    = "CloudFrontInvalidation"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]
    resources = [var.cloudfront_distribution_arn]
  }

  # #992: scoped to this project's services, and further constrained to the
  # project's cluster, instead of "*" (which allowed updating any ECS service
  # in the account).
  statement {
    sid    = "ECSServiceDeploy"
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
    ]
    resources = var.ecs_service_arns

    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [var.ecs_cluster_arn]
    }
  }

  # #992: ecs:RegisterTaskDefinition and ecs:DescribeTaskDefinition are account-
  # level actions — AWS does not support resource-level permissions for them, so
  # "*" is the only valid resource. They are kept in their own statement so the
  # wildcard is visibly limited to these two actions rather than silently
  # covering ecs:UpdateService as well.
  # Ref: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
  statement {
    sid    = "ECSTaskDefinitionRegistration"
    effect = "Allow"
    actions = [
      "ecs:RegisterTaskDefinition",
      "ecs:DescribeTaskDefinition",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cicd_permissions" {
  name   = "${local.name_prefix}-cicd-permissions"
  role   = aws_iam_role.cicd.id
  policy = data.aws_iam_policy_document.cicd_permissions.json
}
