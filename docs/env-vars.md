# Env Vars Reference

This document lists every environment variable used across EsuStellar apps.

## Environment & Secrets Templates Overview

To avoid confusion between configuration files across the monorepo:

| File | Scope & Purpose | Audience | Intended Target |
|---|---|---|---|
| **`.env.example`** (root) | App-level local development defaults | Local app developers / contributors | Copy to `.env` in root or `apps/web/.env.local` |
| **`infra/secrets/templates/.env.example`** | Canonical infra & monorepo secrets reference | SRE / DevOps / CI operators | Canonical inventory for cluster & CI secrets |
| **`environments/testnet/config/secrets.example`** | Testnet sandbox Docker Compose secrets | Testnet sandbox operators | Copy to text files in `environments/testnet/config/secrets/` |

For detailed secrets management policies and rotation cadences, refer to [`infra/secrets/README.md`](../infra/secrets/README.md).


## `apps/web`
# Reference: Issue #536
| Variable | Description | Required | Default |
|---|---|---|---|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Stellar RPC endpoint | Yes | — |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Deployed Registry contract ID | Yes | — |
| `NEXT_PUBLIC_SAVINGS_CONTRACT_ID` | Deployed Savings contract ID | Yes | — |
| `NEXT_PUBLIC_CONTRACT_ID` | Legacy alias for Savings contract ID | Yes | — |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase | No | `Test SDF Network ; September 2015` |
| `NODE_ENV` | Runtime environment | No | `development` |

## `contracts/`

No runtime env vars — contracts are configured at deploy time via `deploy.sh`.
  // const [loading, setLoading] = useState(true);
## `scripts/`

| Variable | Description | Required |
|---|---|---|
| `STELLAR_NETWORK` | Target network (`testnet` / `mainnet`) | Yes |
| `DEPLOYER_KEY` | Secret key for deployer identity | Yes |
