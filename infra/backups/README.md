# Backup Strategy and Restore Procedure

This directory contains backup scripts for stateful components of the EsuStellar
platform. A backup is only as good as a **restore that has actually been
performed**, so this document covers both directions.

## Current Coverage

| Component | Backup Script | Storage | Retention |
|-----------|---------------|---------|-----------|
| Indexer PostgreSQL (`esustellar_indexer`) | `backup-indexer.sh` | S3 (`${PROJECT_NAME}-${ENVIRONMENT}-backups/indexer/`) | 30 days (configurable via `RETENTION_DAYS`, enforced server-side by an S3 lifecycle rule — see below) |

## Restore Procedure (Indexer)

This is the procedure to follow when the indexer database is corrupt, was
dropped by a bad migration, or must be rolled back to a known-good point.

### 1. Decide whether you actually need a restore

Restoring replaces the current database. If the problem is a single bad row or a
failed migration, a targeted fix is safer than a full restore.

### 2. Take a snapshot of the current state first

```bash
export AWS_PROFILE=esustellar-<env>
export ENVIRONMENT=testnet            # testnet | staging | mainnet

# Preserve whatever is there now, even if broken — it may contain data that
# exists nowhere else.
BACKUP_BUCKET="s3://${PROJECT_NAME:-esustellar}-${ENVIRONMENT}-backups"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer \
  | gzip | aws s3 cp - "${BACKUP_BUCKET}/indexer/pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
```

### 3. List available backups

```bash
BACKUP_BUCKET="s3://${PROJECT_NAME:-esustellar}-${ENVIRONMENT}-backups"
aws s3 ls "${BACKUP_BUCKET}/indexer/" --human-readable
```

Backup filenames are `YYYYMMDD-HHMMSS.sql.gz` in UTC, so lexical order is
chronological order.

### 4. Verify the chosen backup before restoring into it

Do not skip this. `backup-verify.sh` checks gzip integrity, which catches a
truncated upload but **not** a dump that was already incomplete when it was
taken.

```bash
BACKUP_BUCKET="s3://${PROJECT_NAME:-esustellar}-${ENVIRONMENT}-backups" \
  bash ../scripts/backup-verify.sh

# Inspect the dump's table list without loading it:
aws s3 cp "${BACKUP_BUCKET}/indexer/20240115-030000.sql.gz" - \
  | gunzip | grep -c 'CREATE TABLE'
```

A restore drill should confirm the expected tables exist and the row counts are
plausible for the timestamp.

### 5. Decide restore mode

**Full restore** — the database is dropped and recreated from the dump.

```bash
# Take the app out of the write path first. If the indexer is behind an ECS
# service or a Kubernetes Deployment, scale it to 0 or set it read-only;
# otherwise it will write into the restored database while it loads.
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'esustellar_indexer';"

psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS esustellar_indexer;"
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE esustellar_indexer;"

aws s3 cp "${BACKUP_BUCKET}/indexer/20240115-030000.sql.gz" - \
  | gunzip | psql -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer \
      --single-transaction --set ON_ERROR_STOP=on
```

`--single-transaction` plus `ON_ERROR_STOP=on` is the important part: it makes
the restore atomic, so a failure part-way through leaves you with an empty
database rather than a half-populated one.

**Targeted restore** — recover one table into the live database without
dropping anything:

```bash
aws s3 cp "${BACKUP_BUCKET}/indexer/20240115-030000.sql.gz" - \
  | gunzip | sed -n '/^CREATE TABLE public\.payments/,/^\\.$/p' \
  | psql -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer \
      --single-transaction --set ON_ERROR_STOP=on
```

### 6. Verify and reopen the write path

```bash
psql -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer -c '\dt'
psql -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer -c "SELECT count(*) FROM payments;"
```

Compare against the indexer's own metrics. The `esustellar-deployer-balance`
Prometheus alert family and the balance exporter will show whether the indexer
is picking up fresh chain state again; an indexer restored to a stale timestamp
will look healthy while silently serving months-old data.

### 7. Record the incident

Record which backup was restored, how long the restore took, and whether the
write path was down throughout. This is the RTO figure for the next review.

## Restore Drill (do this on a schedule, not during an incident)

An untested restore procedure is an assumption, not a procedure. Run this at
least quarterly against a scratch database, never against a live one:

```bash
export DRILL_DB=esustellar_indexer_restore_drill

createdb -h "$DB_HOST" -U "$DB_USER" "$DRILL_DB"
aws s3 cp "${BACKUP_BUCKET}/indexer/<latest>.sql.gz" - \
  | gunzip | psql -h "$DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
      --single-transaction --set ON_ERROR_STOP=on
psql -h "$DB_HOST" -U "$DB_USER" -d "$DRILL_DB" -c '\dt'
dropdb -h "$DB_HOST" -U "$DB_USER" "$DRILL_DB"
```

Log the drill date and elapsed time. A drill that fails is a **backup bug**, not
a drill bug — treat it with the same urgency as a failed backup run.

## RPO / RTO

| Property | Value | Determined by |
|----------|-------|---------------|
| RPO (max data loss) | one backup interval | How often `backup-indexer.sh` runs. Nothing in this repo schedules it — it must be wired into cron or CI, and **there is no alerting on failure** (see `infra/scripts/README.md`), so an unnoticed failure silently extends the RPO. |
| RTO (restore time) | ~5–15 min for the indexer | Dump size plus load time. Measure it during a drill; do not guess. |

## Backup Bucket Configuration

The destination bucket is **provisioned by Terraform**, not created by hand:

```
aws_s3_bucket.backups  in  infra/terraform/main.tf   →  ${PROJECT_NAME}-${ENVIRONMENT}-backups
```

It matches the `uploads` bucket's posture: versioning enabled, SSE-KMS with the
project's storage key, all public access blocked, and `force_destroy = false`.
An S3 lifecycle configuration expires `indexer/` objects after 30 days and
aborts incomplete multipart uploads after 7 days.

`backup-indexer.sh` also deletes by cutoff date after each run. That step is a
best-effort early cleanup; the lifecycle rule is the authoritative bound, so an
aborted run cannot leave objects forever. Both use the same 30-day window — keep
`RETENTION_DAYS` and the lifecycle rule's `expiration.days` in sync.

Get the bucket name from Terraform rather than hardcoding it:

```bash
terraform -chdir=infra/terraform output -raw backups_bucket_uri
```

## Explicitly NOT Backed Up (and Why)

| Component | Reason |
|-----------|--------|
| Grafana dashboards/config | Fully provisioned via IaC (ConfigMaps in `infra/monitoring/grafana/dashboards/`). Any manual changes are overwritten on deploy. |
| Prometheus TSDB | Retention handled by Prometheus itself (`--storage.tsdb.retention.time=30d` in `prometheus-deployment.yaml`). Remote storage not configured. |
| Application database (`DATABASE_URL`) | No persistent application database in current architecture; web app is stateless. |
| Loki log storage | Ephemeral (`emptyDir` in `loki.yaml`). Logs retained in S3 via separate logging pipeline if configured. |
| Redis/Valkey | Not currently deployed. |

Note that this table is also a restore-runbook gap: there is no documented
recovery path for any row in it. If one of these becomes stateful, it needs a
restore procedure in this document, not just a backup script.

## Adding New Backup Coverage

If a new stateful component is added:
1. Create a new backup script in this directory
2. Add the destination to the lifecycle rule in `infra/terraform/main.tf`
3. Update both tables in this README
4. Add the script to the backup cron job / scheduler
5. Add alerting on failure — an unmonitored backup that stops running is
   indistinguishable from a healthy backup system until a restore is needed
6. **Perform and time a full restore drill** (above), and record the RTO