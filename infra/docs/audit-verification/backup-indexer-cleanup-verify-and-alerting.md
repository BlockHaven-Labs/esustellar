# Audit verification: backup-indexer.sh cleanup, restore verification and failure alerting

For each issue below, this records where the requested behaviour exists on `main`.
Evidence was gathered by reading files. Nothing was run against S3.

## #1494: cutoff-date comparison

- **Resolution:** The `awk` filter now accepts only `YYYY-MM-DD` dates. It strips the dashes and compares numerically against `CUTOFF_DATE` (`YYYYMMDD`), so both sides use the same format.
- **Evidence:** `infra/backups/backup-indexer.sh` ("Cleanup old backups" block, `gsub("-", "", d); if (d + 0 < cutoff + 0)`)
- **Status:** Satisfied.

## #1495: restore verification

- **Resolution:** `infra/scripts/backup-verify.sh` downloads the newest backup and runs `gunzip -t` on it. It is designed to run on its own schedule shortly after the backup job.
- **Evidence:** `infra/scripts/backup-verify.sh:1-4,23`
- **Status:** Satisfied for integrity, meaning truncation or corruption is caught. A restore-to-scratch-DB drill is documented in `infra/backups/README.md`.

## #1496: alert on backup failure

- **Resolution:** An `ERR` trap calls `notify_failure`, which posts to `SLACK_WEBHOOK_URL` when it is set, with the failing line and exit code.
- **Evidence:** `infra/backups/backup-indexer.sh:6-19`
- **Status:** Satisfied.

## #1497: validate-env.sh coverage

- **Resolution:** Fixed in this PR. `--deploy` (or `CHECK_DEPLOY_VARS=1`) now also requires `STELLAR_RPC_URL`, `STELLAR_NETWORK_PASSPHRASE`, `NEXTAUTH_SECRET` and `DEPLOYER_SECRET_KEY`. The default, frontend-only behaviour is unchanged.
