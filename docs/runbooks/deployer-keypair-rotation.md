# Deployer Keypair Rotation Runbook

This runbook documents the procedure for rotating the EsuStellar deployer Stellar keypair without causing deployment downtime.

---

## When to Rotate

- Suspected key compromise
- Scheduled security rotation (recommended every 90 days)
- Team member with key access leaves the project

---

## Pre-rotation Checklist

- [ ] No deployments in progress
- [ ] You have write access to CI/CD secrets (GitHub Actions → Repository Secrets)
- [ ] Stellar CLI is installed and authenticated locally

---

## Automated Rotation (recommended)

Run the rotation script:

```bash
./infra/scripts/rotate-deployer-keypair.sh [network]
# Default network: testnet
# For mainnet: ./infra/scripts/rotate-deployer-keypair.sh mainnet
```

The script will:
1. Generate a new `deployer-new` keypair
2. Fund the account (Friendbot on testnet; manual on mainnet)
3. Print the new public and secret keys — **save the secret key immediately**
4. Remove the old `deployer` local identity
5. Rename `deployer-new` → `deployer`

---

## Post-rotation Steps

1. Update the `DEPLOYER_SECRET_KEY` secret in CI/CD (GitHub → Settings → Secrets → Actions).
2. Trigger a test deployment to confirm the new key works.
3. Verify the old public key no longer appears in `stellar keys ls`.

---

## Manual Rotation (fallback)

If the script is unavailable:

```bash
# 1. Generate new keypair
stellar keys generate deployer-new --network testnet --no-fund
stellar keys fund deployer-new --network testnet   # testnet only

# 2. Note new public key
stellar keys address deployer-new

# 3. Note new secret key (update CI/CD secrets immediately)
stellar keys show deployer-new

# 4. Remove old keypair
stellar keys rm deployer

# 5. Rename
NEW_SECRET=$(stellar keys show deployer-new)
stellar keys add deployer --secret-key "$NEW_SECRET"
stellar keys rm deployer-new
```

---

## Rollback

If the new key fails:

1. Restore the old secret key from your secrets manager.
2. Re-add it locally: `stellar keys add deployer --secret-key <OLD_SECRET>`.
3. Revert the CI/CD secret.

---

## Related

- `infra/scripts/rotate-deployer-keypair.sh` — automation script
- `deploy.sh` — uses the `deployer` identity for contract deployments
- GitHub issue: [#534](https://github.com/BlockHaven-Labs/esustellar/issues/534)
