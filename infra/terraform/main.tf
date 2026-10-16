module "storage" {
  source = "./modules/storage"

  project_name = var.project_name
  environment  = var.environment
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source = "./modules/vpc"

  project_name          = var.project_name
  environment           = var.environment
  vpc_cidr              = "10.0.0.0/16"
  availability_zones    = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs   = [for index in range(2) : cidrsubnet("10.0.0.0/16", 8, index)]
  private_subnet_cidrs  = [for index in range(2) : cidrsubnet("10.0.0.0/16", 8, index + 2)]
  nat_gateway_count     = 1
  enable_flow_logs      = var.enable_logging
  allowed_ingress_cidrs = var.allowed_ingress_cidrs
}
