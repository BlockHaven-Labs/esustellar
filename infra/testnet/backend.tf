# #990: this is a separate Terraform root (it consumes ../terraform as a child
# module), so it needs its own state key. Reusing the shared root's key here
# would make `terraform apply` in either directory clobber the other's state.
#
#   terraform init -backend-config=backend/testnet.hcl
#
# See infra/docs/terraform-state.md for the state-key map covering every root.
terraform {
  backend "s3" {}
}
