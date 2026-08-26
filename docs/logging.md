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
