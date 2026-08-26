# Testnet environment — inherits the shared Terraform module
# and applies testnet-specific overrides.

module "shared" {
  source = "../terraform"

  project_name         = var.project_name
  environment          = "testnet"
  aws_region           = var.aws_region
  enable_logging       = true
  allowed_ingress_cidrs = var.allowed_ingress_cidrs
}

# ── Stellar Testnet RPC access ──────────────────────────────────────────────

resource "aws_ssm_parameter" "stellar_rpc_url" {
  name        = "/${var.project_name}/testnet/stellar-rpc-url"
  description = "Stellar testnet RPC endpoint"
  type        = "String"
  value       = var.stellar_rpc_url

  tags = module.shared.common_tags
}

resource "aws_ssm_parameter" "stellar_network_passphrase" {
  name        = "/${var.project_name}/testnet/stellar-network-passphrase"
  description = "Stellar testnet network passphrase"
  type        = "String"
  value       = "Test Suggested Ledger ; October 2022"

  tags = module.shared.common_tags
}

# ── ECS Fargate for web app ────────────────────────────────────────────────

resource "aws_ecs_cluster" "web" {
  name = "${var.project_name}-testnet-web"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = module.shared.common_tags
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${var.project_name}-testnet-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = var.web_image
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NEXT_PUBLIC_STELLAR_NETWORK", value = "testnet" },
        { name = "NEXT_TELEMETRY_DISABLED",     value = "1" },
      ]

      secrets = [
        {
          name      = "STELLAR_RPC_URL"
          valueFrom = aws_ssm_parameter.stellar_rpc_url.arn
        },
        {
          name      = "STELLAR_NETWORK_PASSPHRASE"
          valueFrom = aws_ssm_parameter.stellar_network_passphrase.arn
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-testnet-web"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = module.shared.common_tags
}

resource "aws_ecs_service" "web" {
  name            = "${var.project_name}-testnet-web"
  cluster         = aws_ecs_cluster.web.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.shared.private_subnet_ids
    security_groups = [aws_security_group.web.id]
  }

  tags = module.shared.common_tags
}

resource "aws_security_group" "web" {
  name_prefix = "${var.project_name}-testnet-web-"
  vpc_id      = module.shared.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(module.shared.common_tags, { Name = "${var.project_name}-testnet-web-sg" })
}

# ── CloudWatch Logs ────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${var.project_name}-testnet-web"
  retention_in_days = 14

  tags = module.shared.common_tags
}

# ── Outputs ────────────────────────────────────────────────────────────────

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.web.arn
}

output "ecs_service_name" {
  value = aws_ecs_service.web.name
}

output "stellar_rpc_url_ssm" {
  value = aws_ssm_parameter.stellar_rpc_url.name
}
