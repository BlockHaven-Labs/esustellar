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
terraform init -backend-config=backend/staging.hcl
terraform plan
terraform apply
```

## Notes

- Uses the `kubernetes` provider and targets the `staging` kubeconfig context.
- `web_replicas` defaults to `2` to keep staging cheaper than production while
  still exercising multi-replica behaviour.
- Secrets are not managed here — supply them via the existing secrets tooling
  under `infra/secrets/`.

## Kubernetes manifests

This Terraform workspace has no `k8s/` directory. The application workloads for
staging (Deployment, Service, Ingress, HPA) are defined in
`infra/k8s/overlays/staging` (Kustomize, on top of `infra/k8s/base`) and applied
with `kubectl apply -k infra/k8s/overlays/staging`. The namespace and config map
created here must exist before applying that overlay.
