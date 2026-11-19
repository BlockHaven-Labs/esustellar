# Audit verification: Grafana datasources, Alertmanager routing, meta-monitoring and backup scope

For each issue below, this records where the requested behaviour exists on `main`.
Evidence was gathered by reading files. Nothing was deployed.

## #1490: duplicate Grafana datasources

- **Resolution:** `infra/monitoring/grafana/datasources/` contains only `datasources.yaml`. The separate `prometheus.yaml` has been removed, so a single provisioning file defines the Prometheus datasource. It is loaded through the `grafana-datasources` configMapGenerator.
- **Evidence:** `infra/monitoring/grafana/kustomization.yaml:12`
- **Status:** Satisfied.

## #1491: Slack webhook source and severity routes

- **Resolution:** The routing tree has explicit `severity: critical` and `severity: warning` routes, which are the two values used in `alert-rules.yaml` and `rpc-alerts.yaml`. Every `slack_configs.api_url` is `{{ .Env.SLACK_WEBHOOK_URL }}`, injected from the environment, and the file notes that webhook URLs must not be hardcoded.
- **Evidence:** `infra/monitoring/prometheus/alertmanager-config.yaml:12-17` (routes), `:21-39` (receivers)
- **Status:** Satisfied.

## #1492: meta-monitoring of the monitoring pipeline

- **Resolution:** The `esustellar-meta-monitoring` group contains `PrometheusConfigReloadFailed` (from `prometheus_config_last_reload_successful`) and `PrometheusNotReady`. Infracost CI failures are covered by `InfracostCICheckFailed` and `InfracostCIFailure`.
- **Evidence:** `infra/monitoring/prometheus/alert-rules.yaml:9-20,89-99`
- **Status:** Satisfied.

## #1493: backup coverage for other stateful components

- **Resolution:** The backups README has a stateful-components table. Grafana is fully provisioned via IaC, and Prometheus TSDB retention is handled by Prometheus (`30d`). The indexer database is the only component backed up by `backup-indexer.sh`. The README also documents what to do when a new stateful component is added.
- **Evidence:** `infra/backups/README.md:168-180`
- **Status:** Satisfied.
