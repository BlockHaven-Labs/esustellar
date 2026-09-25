# #1002: Testnet root MUST share the same S3 remote backend as infra/terraform
# so state is never silently kept only in a local .tfstate file.
terraform {
  backend "s3" {
    bucket         = "esustellar-terraform-state"
    key            = "testnet/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "esustellar-terraform-locks"
    encrypt        = true
  }
}
