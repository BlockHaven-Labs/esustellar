# Secrets Management Strategy

This document describes how EsuStellar manages secrets across development,
staging, and production environments.

## Approach: Kubernetes Secrets + Sealed Secrets

We use a layered approach:

1. **Local development**: `.env` files (gitignored) for developer convenience
2. **CI/CD**: GitHub Actions encrypted secrets
3. **Staging/Production**: Kubernetes Secrets encrypted with Bitnami Sealed Secrets

## Secrets Inventory

### Blockchain / RPC

| Secret | Environment | Description |
|--------|-------------|-------------|
| `STELLAR_RPC_URL` | All | Horizon / RPC endpoint URL |
| `STELLAR_NETWORK_PASSPHRASE` | All | `Test Suggested Ledger` or `Public Global Stellar Network` |
| `DEPLOYER_SECRET_KEY` | CI only | Stellar account used for contract deployment |

### Application

| Secret | Environment | Description |
|--------|-------------|-------------|
| `NEXTAUTH_SECRET` | Staging/Prod | Session encryption key |
| `DATABASE_URL` | Staging/Prod | Postgres connection string (if applicable) |

### Monitoring

| Secret | Environment | Description |
|--------|-------------|-------------|
| `GRAFANA_ADMIN_PASSWORD` | Staging/Prod | Grafana admin password |
| `SLACK_WEBHOOK_URL` | Staging/Prod | Alert routing webhook |

## Local Development

Create a `.env` file in the project root (never commit this):

```bash
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test Suggested Ledger ; October 2022
# Do NOT put deployer keys in .env — use `stellar keys` CLI instead
```

## CI/CD (GitHub Actions)

Secrets are stored in GitHub repository settings under Settings > Secrets.

Required secrets for the CI workflows:

- `CODECOV_TOKEN` — for test coverage uploads

Required secrets for deployment:

- `STELLAR_RPC_URL`
- `DEPLOYER_SECRET_KEY`
- `KUBE_CONFIG` — base64-encoded kubeconfig for the target cluster

## Kubernetes (Sealed Secrets)

For staging and production, we encrypt Kubernetes Secrets using
[Bitnami Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets):

```bash
# Encrypt a secret
kubectl create secret generic app-secrets \
  --from-literal=STELLAR_RPC_URL=https://soroban-testnet.stellar.org \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > infra/secrets/sealed-app-secrets.yaml
```

The `SealedSecret` CRD is safe to commit to the repo. Only the controller
in the cluster can decrypt it.

## Rotation Policy

| Secret | Rotation Cadence |
|--------|-----------------|
| `DEPLOYER_SECRET_KEY` | Every 90 days |
| `NEXTAUTH_SECRET` | Every 90 days |
| `GRAFANA_ADMIN_PASSWORD` | Every 180 days |
| `SLACK_WEBHOOK_URL` | On personnel change |

## What Must NEVER Be Committed

- `.env` files
- Raw Kubernetes secret YAML (unencrypted)
- Private keys or seed phrases
- API tokens in plaintext

If a secret is accidentally committed, rotate it immediately and
check `git log` for any leaked references.

## Verification

After applying this strategy, verify:

1. `git status` shows no `.env` files tracked
2. `.gitignore` includes `.env*`
3. CI workflows reference GitHub Secrets, not hardcoded values
4. Sealed Secrets CRDs are valid: `kubeseal --validate -f infra/secrets/`
