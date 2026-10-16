# Issue #1265: E2E workflows and shared testnet infrastructure

**Files audited:** `.github/workflows/mobile-e2e.yml`,
`.github/workflows/e2e-web.yml`

## Finding
- `mobile-e2e.yml` only runs the Jest unit suite; it starts no environment.
- `e2e-web.yml` runs Playwright against the locally built web app with
  placeholder contract IDs. Neither workflow references `infra/testnet/` or
  `environments/testnet/`, so neither depends on that shared infrastructure.
- Whether the web app makes live calls to the public Soroban testnet RPC
  during Playwright runs was not audited here.

## Guidance
If E2E ever needs a chain, start an ephemeral one in the job (for example
the local quickstart from `environments/testnet/docker-compose.yml`)
instead of pointing at shared testnet.
