#!/usr/bin/env bash
# Issue #907 — Automated indexer data backup.
# Issue #1120 — BACKUP_BUCKET now names a bucket this repo actually provisions.
set -euo pipefail

# Optional Slack webhook for failure notifications
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

notify_failure() {
  local message="$1"
  if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
    curl -s -X POST -H "Content-Type: application/json" \
      -d "{\"text\":\"[esustellar-backup] ${message}\"}" \
      "${SLACK_WEBHOOK_URL}" >/dev/null 2>&1 || true
  fi
}

trap 'notify_failure "backup-indexer.sh failed on line $LINENO with exit code $?"' ERR

# #1120: the previous default was the bare literal "s3://esustellar-backups",
# which no Terraform root declared anywhere — the first scheduled run would have
# failed with NoSuchBucket against a bucket an operator had to create by hand,
# with no versioning, no encryption and no expiry. The default is now derived
# from the same ${project_name}-${environment}-backups name that
# infra/terraform/main.tf provisions (aws_s3_bucket.backups), and the value can
# also be read straight from `terraform output -raw backups_bucket_uri`.
PROJECT_NAME="${PROJECT_NAME:-esustellar}"
ENVIRONMENT="${ENVIRONMENT:-testnet}"
BACKUP_BUCKET="${BACKUP_BUCKET:-s3://${PROJECT_NAME}-${ENVIRONMENT}-backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-esustellar}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "[$(date)] Starting indexer backup..."

# Fail loudly and early if the destination does not exist, instead of letting
# `aws s3 cp` fail mid-dump. A destination that silently does not match the
# Terraform-managed bucket is exactly the class of drift this default is meant
# to prevent, so check the prefix too, not just the bucket.
BUCKET_URI="${BACKUP_BUCKET%/}"
BUCKET_NAME="${BUCKET_URI#s3://}"
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  echo "[$(date)] ERROR: backup bucket '$BUCKET_NAME' does not exist or is not reachable." >&2
  echo "[$(date)] Provision it with: cd infra/terraform && terraform apply -var environment=$ENVIRONMENT" >&2
  echo "[$(date)] Or point BACKUP_BUCKET at an existing bucket." >&2
  exit 1
fi

# Backup indexer database
pg_dump -h "$DB_HOST" -U "$DB_USER" -d esustellar_indexer | \
  gzip | \
  aws s3 cp - "${BACKUP_BUCKET}/indexer/${TIMESTAMP}.sql.gz"

echo "[$(date)] Backup uploaded: ${BACKUP_BUCKET}/indexer/${TIMESTAMP}.sql.gz"

# Cleanup old backups
#
# Terraform owns the authoritative retention bound: aws_s3_bucket_lifecycle_configuration.backups
# expires indexer/ objects after 30 days (noncurrent versions after 30 as well).
# This block is a best-effort early cleanup so the bucket does not sit near its
# storage limits between lifecycle runs; the lifecycle rule is what guarantees
# the window if this step is skipped or fails.
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
echo "[$(date)] Cleaning up backups older than ${CUTOFF_DATE}..."

# aws s3 ls outputs dates as YYYY-MM-DD; convert to YYYYMMDD for correct lexicographic/numeric comparison
aws s3 ls "${BACKUP_BUCKET}/indexer/" | \
  awk -v cutoff="$CUTOFF_DATE" '$1 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ { d = $1; gsub("-", "", d); if (d + 0 < cutoff + 0) print $4 }' | \
  grep -v '^$' | \
  xargs -I {} aws s3 rm "${BACKUP_BUCKET}/indexer/{}" || true

echo "[$(date)] Backup complete."
