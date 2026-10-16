# Issue #1275: secrets.example vs infra/secrets/templates/.env.example

**Files compared:** `environments/testnet/config/secrets.example`,
`infra/secrets/templates/.env.example`

## Finding
`secrets.example` lists three lowercase Docker-secret names. They map to
the canonical `.env.example` variables as follows:

| secrets.example | .env.example |
|---|---|
| `stellar_seed` | `STELLAR_DEPLOYER_SECRET_KEY` (deployer key) |
| `soroban_rpc_url` | `STELLAR_RPC_URL` |
| `stellar_network_passphrase` | `STELLAR_NETWORK_PASSPHRASE` |

All three have a counterpart; the two files differ only in naming and
scope (Docker secrets vs. complete env reference).

## Guidance
Treat `infra/secrets/templates/.env.example` as the source of truth. When
a variable is added there, update `secrets.example` in the same PR.
