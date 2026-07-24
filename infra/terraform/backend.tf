terraform {
  backend "s3" {
    bucket         = "esustellar-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "esustellar-terraform-locks"
    encrypt        = true
  }
}
