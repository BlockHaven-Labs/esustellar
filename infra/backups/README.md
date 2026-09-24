# Backup Strategy

This directory contains backup scripts for stateful components of the EsuStellar platform.

## Current Coverage

| Component | Backup Script | Storage | Retention |
|-----------|---------------|---------|-----------|
| Indexer PostgreSQL (`esustellar_indexer`) | `backup-indexer.sh` | S3 (`esustellar-backups/indexer/`) | 30 days (configurable via `RETENTION_DAYS`) |

## Explicitly NOT Backed Up (and Why)

| Component | Reason |
|-----------|--------|
| Grafana dashboards/config | Fully provisioned via IaC (ConfigMaps in `infra/monitoring/grafana/dashboards/`). Any manual changes are overwritten on deploy. |
| Prometheus TSDB | Retention handled by Prometheus itself (`--storage.tsdb.retention.time=30d` in `prometheus-deployment.yaml`). Remote storage not configured. |
| Application database (`DATABASE_URL`) | No persistent application database in current architecture; web app is stateless. |
| Loki log storage | Ephemeral (`emptyDir` in `loki.yaml`). Logs retained in S3 via separate logging pipeline if configured. |
| Redis/Valkey | Not currently deployed. |

## Adding New Backup Coverage

If a new stateful component is added:
1. Create a new backup script in this directory
2. Update this README with the new entry
3. Add the script to the backup cron job / scheduler
4. Test restore procedure

## Restore Procedure (Indexer)

```bash
# List available backups
aws s3 ls s3://esustellar-backups/indexer/

# Restore specific backup
aws s3 cp s3://esustellar-backups/indexer/20240115-030000.sql.gz - | gunzip | psql -h <host> -U <user> -d esustellar_indexer
```