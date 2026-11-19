# Audit verification: Promtail config, Grafana admin password, dashboard CI and provisioning path

For each issue below, this records where the requested behaviour exists on `main`.
Evidence was gathered by reading files. Grafana was not deployed.

## #1486: duplicate Promtail config

- **Resolution:** The top-level `monitoring/promtail-config.yaml` no longer exists. The one Promtail config is `infra/monitoring/promtail/promtail-config.yaml`. `k8s/monitoring/promtail.yaml` belongs to the deprecated `k8s/` tree (see `k8s/README.md`).
- **Status:** Satisfied.

## #1487: `GRAFANA_ADMIN_PASSWORD` source

- **Resolution:** `GF_SECURITY_ADMIN_PASSWORD` is read through `secretKeyRef` (`grafana-admin` / `password`). It is not a literal value or a ConfigMap entry.
- **Evidence:** `infra/monitoring/grafana/grafana-deployment.yaml:23-27`
- **Status:** Satisfied. The `grafana-admin` Secret must be created from a SealedSecret under `infra/secrets/`.

## #1488: dashboard JSON validated in CI

- **Resolution:** A workflow validates both dashboards with `grafana-dashboard-validator`, including a `--fail-on-warnings` pass.
- **Evidence:** `.github/workflows/monitoring-dashboard-validation.yml:27-37`
- **Status:** Satisfied.

## #1489: provisioning path vs mount path

- **Resolution:** The provider `path` is `/var/lib/grafana/dashboards`. The dashboard ConfigMap (`grafana-dashboard-files`) is mounted at exactly that path.
- **Evidence:** `infra/monitoring/grafana/dashboards/dashboard-provisioning.yaml:17`, `infra/monitoring/grafana/grafana-deployment.yaml:38`, `infra/monitoring/grafana/kustomization.yaml:15`
- **Status:** Satisfied.
