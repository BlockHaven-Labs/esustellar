# ADR 003: Kubernetes as the Deployment Target

## Status
Accepted

## Context
The repo shows two deployment narratives: a Vercel-based one implied
by `infra/docs/secrets.md`, and a Kubernetes-based one backed by
`infra/secrets/README.md` and the extensive `k8s/` / `infra/k8s/`
manifests, Terraform EKS/ECS modules, and monitoring stack. No ADR
previously recorded which one is authoritative.

## Decision
Kubernetes (via the Terraform-provisioned cluster in
`infra/terraform/`) is the deployment target for mainnet, staging, and
testnet. Vercel, where referenced, is limited to preview/local
frontend hosting and is not part of the production deployment path.

## Rationale
- The k8s overlays already encode per-environment replica counts and
  are actively maintained across three environments.
- Terraform modules for VPC/IAM/CDN/DNS are built around EKS/ECS, not
  a serverless frontend host.
- Monitoring (Prometheus/Grafana) is wired to the cluster, not Vercel.

## Consequences
`infra/docs/secrets.md` should be corrected or clarified to stop
implying Vercel is a production target, to avoid this ambiguity
recurring for future contributors.
