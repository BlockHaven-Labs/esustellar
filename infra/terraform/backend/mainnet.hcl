# Remote state for the shared AWS root (infra/terraform), mainnet environment.
bucket         = "esustellar-terraform-state"
key            = "infra/terraform/mainnet/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
