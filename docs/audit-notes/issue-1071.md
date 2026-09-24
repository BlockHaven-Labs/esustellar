# Issue #1071: deploy.sh vs validate-env.sh

**Files audited:** `environments/testnet/scripts/deploy.sh`,
`infra/scripts/deploy/validate-env.sh`

## Finding
The two scripts serve different scopes: `validate-env.sh` checks that
required environment variables are present before a deploy proceeds,
while `deploy.sh` performs the actual testnet deployment steps.

## Decision
These are complementary, not competing. `deploy.sh` should invoke
`validate-env.sh` as its first step and abort on non-zero exit before
doing any deployment work.

## Follow-up
Track the explicit call wiring as a small follow-up change to
`deploy.sh` referencing this note.
