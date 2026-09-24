# Issue #1068: infra/testnet vs environments/testnet

**File audited:** `infra/README.md`

## Finding
`infra/README.md` does not currently explain why `infra/testnet/`
exists separately from `environments/testnet/`.

## Decision (documented relationship)
- `infra/testnet/` — Terraform-managed cloud testnet infrastructure
  (the deployed, shared testnet environment).
- `environments/testnet/` — environment-scoped config and local
  tooling (docker-compose, scripts, secrets template) for working
  against or standing up a local approximation of testnet.

A contributor changing deployed testnet infra should edit
`infra/testnet/`; a contributor changing local testnet tooling or
config should edit `environments/testnet/`.

## Follow-up
Cross-link this note from `infra/README.md` in a focused follow-up.
