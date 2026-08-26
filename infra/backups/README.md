# Backup Automation for Off-Chain Indexer Data

## Overview

This document describes the backup strategy for the EsuStellar off-chain
event indexer. The on-chain data is inherently replicated by the Stellar
network, but the off-chain index (used for fast queries and UI rendering)
needs an explicit backup strategy.

## Backup Strategy

### What Is Backed Up

| Data | Source | Backup Method |
|------|--------|---------------|
| Indexed events | PostgreSQL / SQLite | Automated pg_dump / sqlite3 backup |
| Grafana dashboards | Grafana API | JSON export to S3 |
| Prometheus TSDB | Prometheus | Snapshot to S3 |
| Application state | Redis (if used) | RDB snapshot |

### Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Indexer DB | Daily at 03:00 UTC | 30 days | S3 |
| Grafana dashboards | Weekly on Sunday | 90 days | S3 |
| Prometheus snapshot | Daily at 04:00 UTC | 14 days | S3 |

### Implementation

#### Automated Script: `scripts/backup-indexer.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_BUCKET="s3://esustellar-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

# Backup indexer database
echo "Backing up indexer database..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer | \
  gzip | \
  aws s3 cp - "${BACKUP_BUCKET}/indexer/${TIMESTAMP}.sql.gz"

# Cleanup old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
aws s3 ls "${BACKUP_BUCKET}/indexer/" | \
  awk -v cutoff=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d) '$1 < cutoff {print $4}' | \
  xargs -I {} aws s3 rm "${BACKUP_BUCKET}/indexer/{}"

echo "Backup complete: ${TIMESTAMP}"
```

#### Restore Procedure

```bash
# Download the backup
aws s3 cp s3://esustellar-backups/indexer/20260101-030000.sql.gz /tmp/restore.sql.gz

# Decompress and restore
gunzip /tmp/restore.sql.gz
pg_restore -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer /tmp/restore.sql
```

## RTO / RPO Targets

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | 24 hours (daily backups) |
| **RTO** (Recovery Time Objective) | 1 hour (restore from latest backup) |

## Verification

After applying this strategy, verify:

1. `scripts/backup-indexer.sh` runs successfully via cron
2. Backups appear in the S3 bucket
3. Restore test completes within the RTO target
4. Backup retention cleanup removes old files

## Future Improvements

- Point-in-time recovery (PITR) via WAL archiving
- Cross-region backup replication
- Encrypted backups at rest (S3 SSE-KMS)
- Monitoring for backup job failures
