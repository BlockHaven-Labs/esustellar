terraform {
  # #1308: pinned to the same CLI line as infra/terraform and environments/staging.
  required_version = "~> 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.65.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "testnet"
      ManagedBy   = "terraform"
    }
  }
}
