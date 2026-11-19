# ADR 004: Infrastructure source-of-truth topology

**Status:** Accepted

**Date:** 2026-11-18

## Context

The repository accumulated several parallel infrastructure trees:

- Three Kubernetes manifest locations have existed or been proposed:
  - `infra/k8s/` — Kustomize `base/` plus `overlays/{mainnet,staging,testnet}`.
  - `k8s/` — flat per-environment Deployments, ConfigMaps, Secrets and
    legacy monitoring manifests.
  - `environments/testnet/k8s/` — mentioned in older docs as a possible
    third tree; the directory does not currently exist.
- Four Terraform roots have been referenced:
  - `infra/terraform/` — shared AWS resources and modules.
  - `infra/terraform/state-bootstrap/` — one-time state bucket/lock table.
  - `infra/testnet/` — testnet-specific AWS root.
  - `environments/staging/` — standalone Kubernetes-provider root.
    (`environments/testnet/` is a contract-deployment workspace and has no
    `*.tf` files.)

ADR 003 already decides that `infra/k8s/` is canonical for reusable Kubernetes
infrastructure, but it describes only the two trees that exist today and says
nothing about the Terraform roots. Contributors still have to infer the full
topology from `infra/README.md`. Applying two trees to one cluster has caused
real drift (see `docs/runbooks/dual-manifest-tree-incident.md`).

## Decision

1. `infra/k8s/` is the **only** deployable Kubernetes workload tree. The flat
   `k8s/` tree is retained as reference material for namespaces, ConfigMap
   templates and legacy monitoring manifests; no new deployable resources are
   added there, and no workflow applies it.
2. `environments/testnet/k8s/` is not introduced. If it is ever needed, it
   must be a Kustomize overlay under `infra/k8s/overlays/` instead.
3. The Terraform roots are intentionally separate state boundaries:
   `state-bootstrap` runs first with local state; `infra/terraform` and
   `infra/testnet` own AWS resources with distinct S3 state keys;
   `environments/staging` manages only Kubernetes namespace/ConfigMap objects
   through the Kubernetes provider. They must share CLI/provider pins, checked
   by `infra/scripts/check-terraform-versions.py`.
4. Deprecation of a tree is a separate, explicit change with a migration plan.
   Until then, conflicts are resolved in favour of the canonical column in
   `infra/README.md`, never by merging the trees.

## Consequences

### Positive

- One deployable manifest tree and one documented apply order make ownership
  unambiguous and reduce dual-apply incidents.
- The distinction between state roots (Terraform) and deploy targets
  (Kubernetes) is explicit, so a provider bump or migration has a named owner.
- Legacy manifests remain available for reference while migration is planned.

### Negative

- Two Kubernetes trees still exist physically and must be kept from being
  applied together; the runbook remains necessary.
- ConfigMap templates in `k8s/config/` must be rendered rather than applied
  directly, which adds a deploy step for non-testnet environments.
- Four Terraform roots still require individual `init`/`apply` operations; the
  version-alignment check prevents silent divergence but does not automate
  them.

### Neutral

- No resources are deleted or moved by this ADR.
- ADR 003 remains the decision record for choosing Kubernetes; this ADR records
  the directory topology only.

## References

- [ADR 003 — Kubernetes infrastructure structure](./003-kubernetes-infrastructure-structure.md)
- [infra/README.md — canonical sources and apply order](../../infra/README.md)
- [Dual manifest-tree incident runbook](../runbooks/dual-manifest-tree-incident.md)
