#!/usr/bin/env bash
# Downloads the most recent backup from S3 and verifies it is not
# truncated/corrupted. Run independently of backup-indexer.sh (e.g.
# daily, shortly after the backup job) rather than inline with upload.
set -euo pipefail

BACKUP_BUCKET="${BACKUP_BUCKET:?BACKUP_BUCKET is required}"
SCRATCH_DIR="$(mktemp -d)"
trap 'rm -rf "$SCRATCH_DIR"' EXIT

latest_key=$(aws s3api list-objects-v2 \
  --bucket "$BACKUP_BUCKET" \
  --query 'sort_by(Contents, &LastModified)[-1].Key' \
  --output text)

if [[ -z "$latest_key" || "$latest_key" == "None" ]]; then
  echo "No backups found in s3://$BACKUP_BUCKET" >&2
  exit 1
fi

aws s3 cp "s3://$BACKUP_BUCKET/$latest_key" "$SCRATCH_DIR/backup.sql.gz"

if gunzip -t "$SCRATCH_DIR/backup.sql.gz"; then
  echo "OK: $latest_key passed integrity check"
else
  echo "FAIL: $latest_key is truncated or corrupted" >&2
  exit 1
fi
