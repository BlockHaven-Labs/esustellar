# ADR 003: Kubernetes Infrastructure Structure

**Status:** Accepted

**Date:** 2026-09-26

## Context

The repository contains Kubernetes manifests in two top-level
locations:

- `infra/k8s/` — reusable Kubernetes infrastructure using a base and
  environment-specific Kustomize overlays
- `k8s/` — environment-specific configuration, deployments,
  monitoring, namespaces, and web manifests

The presence of Kubernetes resources in multiple locations can make it
unclear where new infrastructure should be added and can lead to
duplicated or drifting configuration.

The repository already uses ADRs for significant structural decisions,
so the relationship between these Kubernetes directories should be
documented rather than left implicit.

## Decision

`infra/k8s/` is the canonical location for reusable Kubernetes
infrastructure and Kustomize-based deployment structure.

It contains:

- `infra/k8s/base/` — shared Kubernetes resources
- `infra/k8s/overlays/mainnet/` — mainnet-specific configuration
- `infra/k8s/overlays/staging/` — staging-specific configuration
- `infra/k8s/overlays/testnet/` — testnet-specific configuration

The top-level `k8s/` directory is retained for Kubernetes resources
that are currently organized separately from the Kustomize base/overlay
structure, including environment configuration, namespaces,
monitoring, and web resources.

New reusable infrastructure should be added to `infra/k8s/` where
appropriate. New environment-specific resources should follow the
existing organization and should not create another parallel Kubernetes
directory structure.

No existing Kubernetes resources are deleted or moved as part of this
ADR. Any future consolidation or deprecation of resources in `k8s/`
should be handled as a separate change after confirming that the
resources are not still required.

## Consequences

### Positive

- Establishes a clear canonical location for reusable Kubernetes
  infrastructure
- Reduces the risk of creating additional duplicated infrastructure
  structures
- Makes the purpose of `infra/k8s/` and `k8s/` explicit
- Allows future consolidation to happen safely through a separate,
  documented change

### Negative

- Kubernetes resources remain in two locations for now
- Contributors still need to understand the distinction between
  reusable infrastructure and existing standalone resources
- Future consolidation may require additional migration work

### Neutral

- No existing deployment behavior is changed by this ADR
- No Kubernetes resources are removed or renamed
