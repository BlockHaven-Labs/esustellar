# Issue #1044: validate-env.sh required-vars gap

**File audited:** `infra/scripts/deploy/validate-env.sh`

## Finding
`REQUIRED_VARS` currently checks only 3 variables
(`NEXT_PUBLIC_REGISTRY_CONTRACT_ID`, `NEXT_PUBLIC_SAVINGS_CONTRACT_ID`,
`NEXT_PUBLIC_CONTRACT_ID`), while `infra/docs/secrets.md` and
`infra/secrets/README.md` document a larger required set including
`STELLAR_RPC_URL`, `STELLAR_NETWORK_PASSPHRASE`,
`DEPLOYER_SECRET_KEY`, and `NEXTAUTH_SECRET`.

## Decision
This script is intentionally scoped to web-frontend (`NEXT_PUBLIC_*`)
variables. Rename its purpose in a header comment rather than silently
expanding scope, and track a separate deployment-level validator for
the remaining secrets (see #1045).

## Follow-up
Add the clarifying header comment in a focused follow-up diff.
