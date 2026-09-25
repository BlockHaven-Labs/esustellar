# Remote state for the staging Kubernetes root (environments/staging).
bucket         = "esustellar-terraform-state"
key            = "environments/staging/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
