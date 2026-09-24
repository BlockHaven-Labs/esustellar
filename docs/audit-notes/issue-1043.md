# Issue #1043: backup-indexer.sh failure alerting

**File audited:** `infra/backups/backup-indexer.sh`

## Finding
The script relies on `set -euo pipefail` to exit non-zero on error but
sends no notification anywhere on failure, unlike other infra scripts
that already post to `SLACK_WEBHOOK_URL`.

## Recommendation
Wrap the script's invocation (cron/CI) with a trap that posts a
one-line failure message to `SLACK_WEBHOOK_URL`, mirroring the pattern
already used elsewhere in `infra/`, e.g.:

```
trap 'curl -s -X POST -H "Content-type: application/json" \
  --data "{\"text\":\"backup-indexer failed on $(hostname)\"}" \
  "$SLACK_WEBHOOK_URL"' ERR
```

## Follow-up
Apply the trap in a focused follow-up diff to `backup-indexer.sh`.
