# Remote state for the shared AWS root (infra/terraform), testnet environment.
bucket         = "esustellar-terraform-state"
key            = "infra/terraform/testnet/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
