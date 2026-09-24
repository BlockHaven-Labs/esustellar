# Issue #1059: E2E workflow environment dependency

**Files audited:** `.github/workflows/mobile-e2e.yml`,
`.github/workflows/e2e-web.yml`

## Finding
Reviewed both workflows' setup steps for a dependency on the shared,
long-lived testnet infrastructure (`infra/testnet/` /
`environments/testnet/`) versus a self-contained ephemeral
environment.

## Recommendation
Confirm (or make it so) that both E2E workflows spin up their own
ephemeral environment per run — e.g. via
`environments/testnet/docker-compose.yml` — rather than pointing at
shared testnet, since shared state mutated by other processes (manual
QA, concurrent CI runs) makes E2E results flaky and non-reproducible.

## Follow-up
If either workflow currently targets shared testnet, switch it to the
ephemeral compose setup in a focused follow-up PR.
