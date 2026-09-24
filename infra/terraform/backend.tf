# #990: partial backend configuration.
#
# The bucket, key, region and lock table are deliberately NOT hardcoded here.
# This root is applied once per environment (testnet, staging, mainnet), so each
# environment must own a distinct state key — a single shared literal key lets
# one `terraform apply` silently overwrite another environment's state.
#
# Initialise with the matching per-environment config:
#
#   terraform init -backend-config=backend/testnet.hcl
#   terraform init -backend-config=backend/staging.hcl
#   terraform init -backend-config=backend/mainnet.hcl
#
# See infra/docs/terraform-state.md for the state-key map covering every root.
terraform {
  backend "s3" {}
}
