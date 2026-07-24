terraform {
  backend "s3" {
    bucket         = "esustellar-terraform-state"
    key            = "<ENV>/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
