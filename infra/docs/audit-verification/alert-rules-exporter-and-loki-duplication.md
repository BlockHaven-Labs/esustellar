# Audit verification: contract-failure alerts, exporter metrics, exporter self-health and Loki config

For each issue below, this records where the requested behaviour exists on `main`.
Evidence was gathered by reading files. Prometheus rules were not evaluated.

## #1482: alert for contract-call or transaction failures

- **Resolution:** `ContractCallFailureRate` lives in the `stellar-rpc-node` group of `rpc-alerts.yaml`, which Prometheus loads through the same `prometheus-alert-rules` configMapGenerator as `alert-rules.yaml`.
- **Evidence:** `infra/monitoring/prometheus/rpc-alerts.yaml:52`, `infra/monitoring/prometheus/kustomization.yaml` (`configMapGenerator`)
- **Status:** Satisfied.

## #1483: which exporter computes `deployer_account_balance_threshold_*`

- **Resolution:** `alert-rules.yaml` carries a comment saying these metrics and `deployer_account_up` are computed by `monitoring/balance-exporter/index.mjs`.
- **Evidence:** `infra/monitoring/prometheus/alert-rules.yaml:58-60`
- **Status:** Satisfied.

## #1484: alert for the exporter process itself being down

- **Resolution:** `BalanceExporterDown` (group `esustellar-balance-exporter`) fires on `up{job="esustellar-deployer-balance"} == 0` or `absent(...)`. Its description distinguishes it from `DeployerAccountUnreachable` (Horizon down).
- **Evidence:** `infra/monitoring/prometheus/alert-rules.yaml:27-39`
- **Status:** Satisfied.

## #1485: duplicate Loki config

- **Resolution:** The top-level `monitoring/loki-config.yaml` no longer exists (`monitoring/` only holds `README.md` and `balance-exporter/`). The one Loki config is `infra/monitoring/loki/loki-config.yaml`. `k8s/monitoring/loki.yaml` belongs to the deprecated `k8s/` tree (see `k8s/README.md`).
- **Status:** Satisfied. The duplicate has been consolidated.
