# Disaster Recovery Runbook

## Overview

This runbook provides step-by-step recovery procedures for each major
EsuStellar service. Contract state itself is safe on-chain, but the
surrounding infrastructure (web app, indexer, monitoring) needs documented
recovery paths.

## RTO / RPO Targets

| Service | RPO | RTO | Justification |
|---------|-----|-----|---------------|
| Web App | 0 (stateless) | 15 min | Users can't contribute/claim |
| Off-chain Indexer | 24 hours | 1 hour | Data is reconstructible from chain |
| Monitoring | 24 hours | 2 hours | Alerting gap is tolerable briefly |
| RPC Node | 0 (external) | 30 min | Failover to secondary RPC |

---

## 1. Web App Recovery

**Symptoms:** Site unreachable, health checks failing, 5xx errors.

### Step 1: Diagnose

```bash
# Check pod status
kubectl get pods -n esustellar -l app=esustellar-web

# Check recent logs
kubectl logs -n esustellar -l app=esustellar-web --tail=100

# Check HPA status
kubectl get hpa -n esustellar
```

### Step 2: Restart

```bash
# Rolling restart
kubectl rollout restart deployment/esustellar-web -n esustellar

# Watch rollout status
kubectl rollout status deployment/esustellar-web -n esustellar
```

### Step 3: Rollback (if restart fails)

```bash
# Roll to previous version
kubectl rollout undo deployment/esustellar-web -n esustellar

# Check rollout history
kubectl rollout history deployment/esustellar-web -n esustellar
```

### Step 4: Scale Up (if under load)

```bash
kubectl scale deployment/esustellar-web --replicas=4 -n esustellar
```

---

## 2. Off-chain Indexer Recovery

**Symptoms:** Stale data in the UI, events not appearing, query timeouts.

### Step 1: Check Indexer Status

```bash
# Check if indexer process is running
kubectl get pods -n esustellar -l app=indexer

# Check indexer logs
kubectl logs -n esustellar -l app=indexer --tail=100
```

### Step 2: Restore from Backup

```bash
# Download latest backup
aws s3 ls s3://esustellar-backups/indexer/ --recursive | sort | tail -1
aws s3 cp s3://esustellar-backups/indexer/<latest-backup>.sql.gz /tmp/

# Restore
gunzip /tmp/<latest-backup>.sql.gz
PGPASSWORD=$DB_PASSWORD pg_restore -h $DB_HOST -U $DB_USER -d esustellar_indexer /tmp/<latest-backup>.sql

# Restart indexer
kubectl rollout restart deployment/indexer -n esustellar
```

### Step 3: Verify

```bash
# Check event count matches recent chain activity
curl -s https://your-rpc-url/events | jq '.events | length'
```

---

## 3. Monitoring Stack Recovery

**Symptoms:** No alerts firing, Grafana dashboards empty, Loki not ingesting.

### Step 1: Restart in Order

```bash
# 1. Loki (log storage)
kubectl rollout restart deployment/loki -n esustellar-monitoring

# 2. Prometheus (metrics)
kubectl rollout restart deployment/prometheus -n esustellar-monitoring

# 3. Grafana (visualization)
kubectl rollout restart deployment/grafana -n esustellar-monitoring

# 4. Promtail (log shipping)
kubectl rollout restart daemonset/promtail -n esustellar-monitoring
```

### Step 2: Verify Ingestion

```bash
# Loki: check log volume
curl -s "http://loki:3100/loki/api/v1/labels" | jq .

# Prometheus: check targets
curl -s "http://prometheus:9090/api/v1/targets" | jq '.data.activeTargets | length'
```

---

## 4. RPC Node Failover

**Symptoms:** Transaction submissions timing out, contract calls failing.

### Step 1: Confirm It's Not Client-Side

```bash
# Direct RPC health check
curl -s https://soroban-testnet.stellar.org/health | jq .
```

### Step 2: Switch to Secondary RPC

If primary RPC is down, update the environment variable:

```bash
# Update the RPC URL in Kubernetes secrets
kubectl create secret generic stellar-rpc \
  --from-literal=STELLAR_RPC_URL=https://soroban-testnet.stellar.org \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart web app to pick up new config
kubectl rollout restart deployment/esustellar-web -n esustellar
```

---

## Communication Template

```
Subject: [EsuStellar] Service Disruption — [SERVICE NAME]

Impact: [DESCRIPTION OF USER IMPACT]
Status: [Investigating / Identified / Monitoring / Resolved]
ETA: [ESTIMATED TIME TO RESOLUTION]

Updates will be posted every 30 minutes.
```

## Post-Incident

After any incident:

1. Document the timeline in `docs/incident-response.md`
2. Update this runbook if new recovery steps were needed
3. Schedule a blameless post-mortem if RTO was exceeded
