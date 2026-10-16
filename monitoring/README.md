# monitoring/ (DEPRECATED, balance-exporter source only)

> **The canonical monitoring tree is `infra/monitoring/`** (Prometheus, Grafana,
> Loki, Promtail, Alertmanager). See `infra/README.md`. Do not add new
> monitoring config here.

The Loki and Promtail configs that used to live here already moved to
`infra/monitoring/loki/` and `infra/monitoring/promtail/`. What remains is only
the `balance-exporter/` source (`Dockerfile`, `index.mjs`, `terraform.mjs`).

## Still referenced, so not deleted yet

- `.github/workflows/monitoring-dashboard-validation.yml` checks `balance-exporter/index.mjs`.
- `k8s/monitoring/balance-exporter.yaml` inlines a copy of `index.mjs` in a
  ConfigMap. The two copies must be edited together until one is removed.
- `terraform.mjs` is `index.mjs` minus the `balance_exporter_up` gauge (a 7 line
  diff) and has no references in the repo. It is a candidate for deletion.

Planned end state: move this source under `infra/monitoring/balance-exporter/`
and delete this directory.
