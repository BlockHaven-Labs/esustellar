# Terraform State Bootstrap

This module creates the **S3 bucket** and **DynamoDB table** used as a remote backend for all other Terraform configurations in this repository.

## Usage

```bash
# 1. Copy and edit the example vars
cp terraform.tfvars.example terraform.tfvars

# 2. Apply with local state (run once per AWS account)
terraform init
terraform plan
terraform apply
```

After bootstrapping, copy the output values into the `backend "s3"` block of downstream Terraform configs (see `../backend-config.tf`).

## Resources

| Resource | Purpose |
|---|---|
| S3 bucket | Stores `.tfstate` files |
| S3 versioning | Retains history of every state revision |
| S3 SSE | AES-256 encryption at rest |
| S3 public access block | Prevents accidental public access |
| DynamoDB table (PAY_PER_REQUEST) | State locking to prevent concurrent operations |

## Notes

- `prevent_destroy = true` is set on the bucket to prevent accidental deletion of state files.
- This module itself uses **local state**. All downstream configs should use the remote backend created here.
