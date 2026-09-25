# Remote state for the shared AWS root (infra/terraform), staging environment.
bucket         = "esustellar-terraform-state"
key            = "infra/terraform/staging/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
