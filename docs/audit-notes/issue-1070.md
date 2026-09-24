# Issue #1070: testnet docker-compose.yml scope

**File audited:** `environments/testnet/docker-compose.yml`

## Finding
This compose file provides a local/standalone way to run testnet-like
services on a developer machine. It is separate from, and not a
competitor to, the Kubernetes-based `infra/k8s/overlays/testnet/` or the
Terraform-based `infra/testnet/`, which provision the real deployed
testnet infrastructure.

## Decision
`environments/testnet/docker-compose.yml` is for **local development
only** and is never applied to any deployed environment.

## Follow-up
Add a one-line note to `environments/testnet/README.md` pointing here
so future contributors don't mistake it for a fourth deployment target.
