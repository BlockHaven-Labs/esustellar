#!/usr/bin/env bash
# Issue #907 — Automated indexer data backup.
set -euo pipefail

BACKUP_BUCKET="${BACKUP_BUCKET:-s3://esustellar-backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-esustellar}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "[$(date)] Starting indexer backup..."

# Backup indexer database
pg_dump -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer | \
  gzip | \
  aws s3 cp - "${BACKUP_BUCKET}/indexer/${TIMESTAMP}.sql.gz"

echo "[$(date)] Backup uploaded: ${BACKUP_BUCKET}/indexer/${TIMESTAMP}.sql.gz"

# Cleanup old backups
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
echo "[$(date)] Cleaning up backups older than ${CUTOFF_DATE}..."

aws s3 ls "${BACKUP_BUCKET}/indexer/" | \
  awk -v cutoff="$CUTOFF_DATE" '$1 < cutoff {print $4}' | \
  grep -v '^$' | \
  xargs -I {} aws s3 rm "${BACKUP_BUCKET}/indexer/{}" || true

echo "[$(date)] Backup complete."
