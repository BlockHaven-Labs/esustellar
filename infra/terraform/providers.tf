terraform {
  # #1308: kept identical in every Terraform root; check-terraform-versions.py
  # fails the build if one root drifts to a different CLI line.
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
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
