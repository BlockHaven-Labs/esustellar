# k8s/monitoring/ (DEPRECATED, see infra/monitoring/)

Canonical monitoring lives in `infra/monitoring/`. These manifests remain only
because `infra/monitoring/` has no Kubernetes equivalent yet:

- `loki.yaml`, `promtail.yaml`: the only Kubernetes-deployable Loki and Promtail
  (`infra/monitoring/loki` and `promtail` are Docker Compose configs).
  `docs/logging.md` still documents applying them.
- `balance-exporter.yaml`: referenced by
  `infra/monitoring/prometheus/kustomization.yaml` via `../../../k8s/monitoring/`,
  which reaches outside its own tree. It embeds a copy of
  `monitoring/balance-exporter/index.mjs`.

Planned end state: move all three under `infra/monitoring/`, repoint the
Prometheus kustomization and `docs/logging.md`, then delete this directory.
