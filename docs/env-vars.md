# Env Vars Reference

This document lists every environment variable used across EsuStellar apps.

## `apps/web`

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

## `scripts/`

| Variable | Description | Required |
|---|---|---|
| `STELLAR_NETWORK` | Target network (`testnet` / `mainnet`) | Yes |
| `DEPLOYER_KEY` | Secret key for deployer identity | Yes |
