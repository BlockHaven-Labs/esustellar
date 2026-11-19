# Architecture Decision Records (ADRs)

ADRs capture important architectural decisions along with their
context and consequences.

## Template

Use the template in [000-template.md](./000-template.md), including the
"Infrastructure cost impact" section — `.github/workflows/infracost.yml`
already estimates cost on infra PRs, and the ADR should record the decision
behind that number.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-contract-split.md) | Split savings and registry into two contracts | Accepted | 2025-06-01 |
| [002](./002-mvp-scope.md) | MVP scope: no escrow, no dispute resolution | Accepted | 2025-06-15 |
| [003](./003-kubernetes-deployment-target.md) | Kubernetes as the deployment target | Accepted | n/a |
| [003](./003-kubernetes-infrastructure-structure.md) | Kubernetes infrastructure structure | Accepted | 2026-09-26 |
| [004](./004-infrastructure-source-of-truth-topology.md) | Infrastructure source-of-truth topology (3 manifest trees / 4 Terraform roots) | Accepted | 2026-11-18 |
