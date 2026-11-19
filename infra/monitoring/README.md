# infra/monitoring

The canonical monitoring stack: Prometheus, Alertmanager, Grafana, Loki and
Promtail. Deployed by Kustomize from this tree; the root `monitoring/` and
`k8s/monitoring/` directories are deprecated (see `infra/README.md`).

## What runs where

| Component | Directory | Deployed as |
| --- | --- | --- |
| Prometheus + Alertmanager | `prometheus/` | k8s (ConfigMaps, Deployment, Service, PVC) |
| Grafana + dashboards | `grafana/` | k8s (Deployment, PVC, ConfigMap-generated datasources and dashboards) |
| Loki | `loki/loki-config.yaml` | Docker Compose config; also the reference config for the k8s manifest in `k8s/monitoring/loki.yaml` |
| Promtail | `promtail/promtail-config.yaml` | Docker Compose config; the reference config for `k8s/monitoring/promtail.yaml` |
| Deployer balance exporter | `prometheus/balance-exporter.yaml` | k8s, applied as part of the Prometheus kustomization |
| ECS-level observability | `ecs/README.md` | Documentation only — see below |

`loki/` and `promtail/` configs are also mounted by the root
`docker-compose.yml` for local development, so a change here affects both the
local and the cluster behaviour of the log pipeline.

## Alertmanager high availability (#1296)

Alertmanager runs **3 replicas** with a gossip cluster (`--cluster.peer` via
the headless `alertmanager-cluster` Service), preferred pod anti-affinity by
hostname, and a `PodDisruptionBudget` with `minAvailable: 2`. A single replica
was a single point of failure: an outage at the wrong moment would swallow
`DeployerBalanceCritical` and delay funding a deployer key.

Verify after a node drain:

```bash
kubectl -n esustellar-monitoring get pods -l app=alertmanager
kubectl -n esustellar-monitoring get pdb alertmanager
kubectl -n esustellar-monitoring logs -l app=alertmanager --tail=50 | grep -i cluster
```

Prometheus and Grafana remain single-replica by design; losing them costs
query history/dashboards temporarily, but alert delivery survives. That is the
accepted tradeoff — do not assume the whole monitoring stack is HA.

## Prometheus storage (#1295)

Prometheus TSDB is mounted from the `prometheus-data` PersistentVolumeClaim
(50Gi, ReadWriteOnce), **not** `emptyDir`. It is sized for the 30-day retention
configured with `--storage.tsdb.retention.time=30d`. Historical `rate()` and
comparison queries therefore survive pod restarts and node drains.

```bash
kubectl -n esustellar-monitoring get pvc prometheus-data
kubectl -n esustellar-monitoring exec deploy/prometheus -- df -h /prometheus
```

If usage approaches the capacity, grow the PVC or lower retention deliberately;
never switch the volume back to `emptyDir`.

## Grafana datasource provisioning (#1294)

`datasources/datasources.yaml` has exactly one consumer: the
`configMapGenerator` in `grafana/kustomization.yaml`, mounted by
`grafana-deployment.yaml` at `/etc/grafana/provisioning/datasources`. It is not
also listed under `resources`, so kustomize cannot double-apply an unsuffixed
datasource ConfigMap. Add new datasources to that one file; do not create a
second provisioning source.

## Retention policy

Nothing in this stack is left on an "indefinite" default. The authoritative
values and the reasoning behind them are in `docs/logging.md`; the summary:

| Data | Retention | Setting |
| --- | --- | --- |
| Logs in Loki | 720h / 30 days | `limits_config.retention_period` + `compactor.retention_enabled` in `loki/loki-config.yaml` |
| Metrics in Prometheus | 30 days | `--storage.tsdb.retention.time=30d` in `prometheus/prometheus-deployment.yaml` |

30 days is chosen to match the database backup window (`RETENTION_DAYS=30` in
`infra/backups/`), so "how far back can we see?" has one answer across logs,
metrics and backups.

**Loki currently stores to the local filesystem**, and the Kubernetes manifest
mounts `emptyDir`, so logs do not survive a Loki pod restart and the 720h
policy is not what bounds disk usage yet. Moving `storage_config` to an object
store is the prerequisite for treating these logs as durable.

## Secret redaction

`promtail/promtail-config.yaml` runs pipeline stages that redact canonical
Stellar secret keys and common named-secret shapes before anything is shipped
to Loki. Loki retains logs for 30 days and is readable by anyone with Grafana
dashboard access, so a secret that reaches it should be treated as compromised.
The stages are defence in depth — the real control is that
`infra/scripts/rotate-deployer-keypair.sh` writes the new key to a mode-600 file
instead of printing it.

## Dashboards are provisioned, not edited in the UI

Grafana runs with `editable: false` and the dashboards in `grafana/dashboards/`
are the source of truth; provisioning overwrites any UI edit on restart. See
`grafana/dashboards/README.md` for the edit → export → reconcile → commit →
restart workflow.

## ECS

`ecs/README.md` documents the legacy ECS path. Production runs on Kubernetes
(see `infra/README.md`); nothing here scrapes ECS.