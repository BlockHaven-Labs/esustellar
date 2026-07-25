# EsuStellar Staging Environment (Terraform)

Terraform workspace that provisions the staging environment. Staging mirrors
production at reduced scale (fewer replicas) for integration testing.

## Contents

```
environments/staging/
├── main.tf            # Namespace + config map for staging
├── variables.tf       # Input variables (scale, network, kube context)
├── outputs.tf         # Namespace / config map / replica outputs
├── terraform.tfvars   # Default staging values (reduced scale)
└── README.md          # This file
```

## Usage

```bash
cd environments/staging
terraform init
terraform plan
terraform apply
```

## Notes

- Uses the `kubernetes` provider and targets the `staging` kubeconfig context.
- `web_replicas` defaults to `2` to keep staging cheaper than production while
  still exercising multi-replica behaviour.
- Secrets are not managed here — supply them via the existing secrets tooling
  under `infra/secrets/`.
