# State bucket, key, and lock table are supplied by backend/testnet.hcl.
terraform {
  backend "s3" {}
}
