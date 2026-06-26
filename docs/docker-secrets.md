# Docker Secrets & Sensitive Config

## Secrets Directory

Create a `secrets/` directory at the project root (gitignored):

```
secrets/
├── soroban_rpc_url.txt
├── stellar_network_passphrase.txt
└── stellar_seed.txt
```

## Usage with Docker Compose

The `docker-compose.yml` mounts these as Docker secrets:

```yaml
secrets:
  soroban_rpc_url:
    file: ./secrets/soroban_rpc_url.txt
  stellar_network_passphrase:
    file: ./secrets/stellar_network_passphrase.txt
```

Services consume secrets at `/run/secrets/<name>`.

## Env File Alternative

For simpler setups, place env vars in `apps/web/.env.local`:

```
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=...
NEXT_PUBLIC_SAVINGS_CONTRACT_ID=...
```

## Security Notes

- Never commit `secrets/` or `.env.local`
- Rotate secrets before promoting to production
- Use GitHub secrets in CI, not env files
