# Remote state for the testnet environment root (infra/testnet).
bucket         = "esustellar-terraform-state"
key            = "infra/testnet/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
