# Deployer Keypair Rotation Runbook

This runbook documents the procedure for rotating the EsuStellar deployer Stellar keypair without causing deployment downtime.

---

## When to Rotate

- Suspected key compromise
- Scheduled security rotation (recommended every 90 days)
- Team member with key access leaves the project

---

## Pre-rotation Checklist

- [ ] No deployments or migrations in progress, and no transaction signed with the old key waiting to be submitted (see [In-flight transactions](#in-flight-transactions-during-rotation))
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
3. Write the new credentials to a mode-600 temp file (never stdout) — **save the secret key immediately**
4. Verify the new key can sign for its address (offline check, nothing is submitted), then keep the old identity as `deployer-old` (it is not deleted automatically)
5. Rename `deployer-new` → `deployer` by copying it through stdin (a seed-phrase key keeps its phrase), checking the copy, then removing the old name. If the copy cannot be verified the script stops and leaves both keys in place

Before it touches any key the script asks you to confirm nothing is in flight. For non-interactive use, set `ROTATION_CONFIRM_NO_INFLIGHT=yes` after checking yourself.

---

## In-flight transactions during rotation

Rotation replaces the key that this machine and CI sign with. It does not change anything on the Stellar network about the **old** account: the script creates a *new* account and renames local key identities. What that means for work that is already under way:

| Situation | What happens | What to do |
|---|---|---|
| A transaction was signed with the old key but not yet submitted | The signed envelope is still valid. It can be submitted until its time bounds expire (or forever, if none were set) or until its sequence number is used, because the old account still exists. Nothing in the rotation cancels it. | Submit it before rotating, or let it expire. Prefer short time bounds on deploy and migration transactions so this window is small. If the old key is compromised, treat any outstanding signed envelope as live. |
| A deployment or migration (for example `contracts/migration_coordinator`) is part-way through | Steps already submitted stay on-chain. Remaining steps signed with the old key fail once CI uses the new secret. The new key is a different account, so it has its own sequence number and cannot continue the old account's sequence. | Do not rotate mid-run. Finish or abort the run, then rotate and start any new run with the new key. |
| A deployed contract stored the old address as its admin | The contract keeps requiring authorization from that address. For example `migration_coordinator` calls such as `register_version` and `deprecate_version` check the stored admin. The contracts here expose `initialize` for their admin but no function to change it (the registry's `transfer_admin` changes a *group's* admin, not the contract's). | Keep the old key (`deployer-old`, and your secrets manager copy) for as long as any contract names it as admin, even after the suggested 24h grace period. Do not merge or otherwise retire the old account while it is still an admin. Record which contracts name which admin. |

The script cannot detect signed-but-unsubmitted transactions, because they exist only on whoever signed them, so it asks you to confirm instead (Step 0).

---

## Post-rotation Steps

1. Update the `DEPLOYER_SECRET_KEY` secret in CI/CD (GitHub → Settings → Secrets → Actions).
2. Trigger a test deployment to confirm the new key works.
3. Confirm `stellar keys address deployer` prints the new public key.
4. The old key stays in the keystore as `deployer-old`. Once the new key works in CI/CD (24h is a sensible minimum) and no deployed contract names the old address as its admin, remove it with `stellar keys rm deployer-old`. The script refuses to start another rotation while `deployer-old` exists.

## Rolling back

If updating `DEPLOYER_SECRET_KEY` in CI/CD fails or the new key misbehaves, and `deployer-old` is still there:

```bash
stellar keys show deployer-old | stellar keys add deployer --overwrite
# if deployer-old was created from a seed phrase, keep the phrase instead:
# stellar keys show deployer-old --phrase | stellar keys add deployer --overwrite
```

Then put the old secret back in `DEPLOYER_SECRET_KEY`. This replaces the local `deployer` (the new key); the new account on the network is unaffected. `stellar keys add` reads the secret from stdin and does not accept it as an argument.

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

# 4. Keep the old keypair as deployer-old instead of deleting it
#    (`stellar keys add` reads the secret from stdin; it does not take it as an argument)
stellar keys show deployer --phrase | stellar keys add deployer-old --seed-phrase
stellar keys rm deployer

# 5. Rename deployer-new to deployer
stellar keys show deployer-new --phrase | stellar keys add deployer --seed-phrase
stellar keys rm deployer-new
```

The commands above copy by seed phrase, which is what `stellar keys generate` stores, so the mnemonic is kept. For a key that has no phrase (`stellar keys show NAME --phrase` fails with "identity is not tied to a seed phrase"), drop `--phrase` from `show` and use `--secret-key` instead of `--seed-phrase` on `add`. A key in the OS secure store cannot be copied this way.

---

## Rollback

If the new key fails:

1. Restore the old secret key from your secrets manager.
2. Re-add it locally with `stellar keys add deployer --overwrite --secret-key`; the CLI prompts for the secret, so it stays out of your shell history and process list.
3. Revert the CI/CD secret.

---

## Related

- `infra/scripts/rotate-deployer-keypair.sh` — automation script
- `deploy.sh` — uses the `deployer` identity for contract deployments
- GitHub issue: [#534](https://github.com/BlockHaven-Labs/esustellar/issues/534)
