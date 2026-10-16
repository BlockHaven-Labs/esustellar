# Issue #1277: deploy.sh vs validate-env.sh

**Files audited:** `environments/testnet/scripts/deploy.sh`,
`infra/scripts/deploy/validate-env.sh`

## Finding
The scripts are complementary, not competing deployment paths, and neither
calls the other:

- `deploy.sh` deploys the contracts and writes the contract IDs
  (`NEXT_PUBLIC_REGISTRY_CONTRACT_ID`, ...) to `apps/web/.env.local`.
- `validate-env.sh` defaults to reading that same `apps/web/.env.local`
  and fails if required variables are missing or empty.

No conflict: both use the same file and variable names.

## Guidance
Run `deploy.sh` first, then `infra/scripts/deploy/validate-env.sh` before
building or releasing the web app.
