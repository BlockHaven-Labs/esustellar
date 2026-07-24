# Backup & Restore Procedures

## What to Backup

| Asset | Location | Frequency |
|---|---|---|
| Stellar Quickstart data | `stellar-data` Docker volume | Daily |
| Contract deployment info | `deployment-info.json` | Per deploy |
| Env / secrets | `apps/web/.env.local`, `secrets/` | Per change |
| Docker images | GHCR (immutable by tag) | Per build |

## Backup Commands

```bash
# Backup Quickstart volume
docker run --rm -v stellar-data:/source -v ./backups:/dest \
  alpine tar czf /dest/stellar-data-$(date +%F).tar.gz -C /source .

# Backup deployment info
cp deployment-info.json backups/deployment-info-$(date +%F).json
```

## Restore

```bash
# Restore Quickstart volume
docker run --rm -v stellar-data:/dest -v ./backups:/source \
  alpine tar xzf /source/stellar-data-<date>.tar.gz -C /dest
```

## Disaster Recovery

1. Provision new VM from base image
2. Restore `.env.local` and secrets from safe storage
3. Restore Stellar Quickstart volume
4. `docker compose up -d`
5. Verify contract IDs match `deployment-info.json`
6. Run health checks

## Testing

Restore into a staging environment quarterly to validate the procedure.
