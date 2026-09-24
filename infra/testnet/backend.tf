# #990/#1002: this is a separate Terraform root (it consumes ../terraform as a child
# module), so it needs its own state key. Reusing the shared root's key here
# would make `terraform apply` in either directory clobber the other's state.
# It MUST share the same S3 remote backend as infra/terraform so state is never
# silently kept only in a local .tfstate file.
#
#   terraform init -backend-config=backend/testnet.hcl
#
# See infra/docs/terraform-state.md for the state-key map covering every root.
terraform {
  backend "s3" {}
}
