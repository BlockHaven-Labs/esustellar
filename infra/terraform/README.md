# Terraform

This directory contains Terraform configurations for managing EsuStellar infrastructure.

## Layout

```
terraform/
├── README.md                # This file
├── backend-config.tf        # Reusable remote backend config template
└── state-bootstrap/         # Bootstrap module: S3 bucket + DynamoDB for remote state
```

## Quick Start

### 1. Bootstrap remote state infrastructure

See [state-bootstrap/README.md](state-bootstrap/README.md).

### 2. Use the remote backend

After bootstrapping, copy `backend-config.tf` into each Terraform module and update the `key` to match the environment (e.g. `testnet/terraform.tfstate`).

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- AWS credentials configured (env vars, `~/.aws/credentials`, or IAM role)
