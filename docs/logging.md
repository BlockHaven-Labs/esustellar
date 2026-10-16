# 📊 Centralised Log Aggregation (Loki & Grafana)

This document describes the centralised logging infrastructure for EsuStellar. Container logs from the web application, Nginx reverse proxy, and related microservices are collected by Promtail and shipped to Grafana Loki for storage and querying via Grafana.

---

## Architecture Overview
# Reference: Issue #536
```
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │   apps/web      │       │      Nginx      │       │   Stellar RPC   │
 └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
          │ (docker logs)           │ (docker logs)           │ (docker logs)
          └─────────────────────────┼─────────────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │     Promtail     │
                          └─────────┬────────┘
                                    │ (HTTP push /3100)
                                    ▼
                          ┌──────────────────┐
                          │   Grafana Loki   │
                          └─────────┬────────┘
                                    │ (Datasource)
                                    ▼
                          ┌──────────────────┐
                          │   Grafana UI     │
                          │  (Port 3001)     │
                          └──────────────────┘
```

---

## 🚀 Quick Start (Docker Compose)

Centralised logging is pre-configured in `docker-compose.yml`:

```bash
# Start all services including Loki, Promtail, and Grafana
docker compose up -d

# Check status of Loki and Promtail
docker compose ps loki promtail grafana
```

Access Grafana at `http://localhost:3001` (Credentials: `admin` / `admin`).
The **Loki** datasource is pre-configured as the default log query source.

---

## ☸️ Kubernetes Deployment

Kubernetes manifests for Loki and Promtail are located in `k8s/monitoring/`:

- `k8s/monitoring/loki.yaml`: Loki ConfigMap, Deployment, and Service.
- `k8s/monitoring/promtail.yaml`: Promtail DaemonSet, ServiceAccount, ClusterRole, and ConfigMap.

To deploy on Kubernetes:

```bash
kubectl apply -f k8s/monitoring/loki.yaml
kubectl apply -f k8s/monitoring/promtail.yaml
kubectl apply -f infra/monitoring/grafana/
```

---

## 🗄️ Log Retention Policy

Retention is explicit everywhere rather than left at the "keep it forever"
default. Every number below is set in a committed config file, so changing it is
a reviewable diff.

| Data | Store | Retention | Where it is configured |
| ---- | ----- | --------- | ---------------------- |
| Application + infra logs | Loki | **720h (30 days)** | `limits_config.retention_period` and `compactor.retention_enabled` in `infra/monitoring/loki/loki-config.yaml` |
| Prometheus metrics (TSDB) | Prometheus | **30 days** | `--storage.tsdb.retention.time=30d` in `infra/monitoring/prometheus/prometheus-deployment.yaml` |
| Database backups | S3 | **30 days** | `RETENTION_DAYS=30` in `infra/backups/backup-indexer.sh`, enforced server-side by the lifecycle rule on `aws_s3_bucket.backups` |
| Grafana state | PVC | 10Gi PVC, not time-bounded | `grafana-storage` PVC in `infra/monitoring/grafana/grafana-deployment.yaml` |

The 30-day window is deliberate: it matches the database backup retention, so
"how far back can we go?" has the same answer for logs, metrics and backups. An
incident that needs more than 30 days of history is a signal that the window
should be raised deliberately (and priced), not that the setting was forgotten.

### How Loki's retention actually works

`retention_period: 720h` alone is not sufficient for the compactor to delete
anything. Both of these must be set, and both are:

```yaml
limits_config:
  retention_period: 720h   # the value queries are allowed to reach back to
compactor:
  retention_enabled: true  # without this, expired data is never actually deleted
```

With `retention_enabled: false`, Loki accepts and stores logs indefinitely and
simply refuses to answer queries older than `retention_period` — the storage
keeps growing while the UI looks correct. `retention_delete_delay: 2h` gives
in-flight queries time to finish before chunks are removed.

### Known limitation of the current deployment

`infra/monitoring/loki/loki-config.yaml` stores chunks on the **local
filesystem** (`/tmp/loki`), and the Kubernetes Loki manifest mounts `emptyDir`.
So today the 30-day policy is not what is bounding disk usage — the pod's volume
is, and it resets on every restart. That is acceptable while logs are
development-only, but it means **nothing survives a Loki pod restart**.

Before treating Loki as an audit trail or an incident-evidence source, migrate
`storage_config` to an object store (S3 or GCS) with `retention_enabled: true`,
at which point the 720h policy becomes the real bound and becomes billable. That
migration is the prerequisite for relying on these logs after an incident.

### Querying within the retention window

Loki answers queries over the whole retained window, but the UI defaults to a
short range. When investigating something older than a few hours, widen the time
picker explicitly — an empty result may mean "outside the window", not "never
logged".

---

## 🔍 Log Querying Examples (LogQL)

In Grafana **Explore** tab (`http://localhost:3001/explore`):

- **Query Web App Logs**:
  `{container="esustellar-web"}`
- **Query Error Logs**:
  `{container=~".+"} |= "error"`
- **Rate of Errors**:
  `sum(rate({container="esustellar-web"} |= "error" [5m]))`

---

## 🛠️ Verification Script

Run the automated logging configuration validator:

```bash
npm run validate-monitoring
# or
bash ./scripts/validate-monitoring-config.sh
```
