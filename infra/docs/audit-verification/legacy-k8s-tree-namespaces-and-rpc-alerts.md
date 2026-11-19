# Audit verification: legacy k8s/ tree, namespace names, testnet copies and rpc-alerts

For each issue below, this records where the requested behaviour exists on `main`.
Evidence was gathered by reading files. Nothing was rendered or applied to a cluster.

## #1478: resources and probes in `k8s/deployments/`

- **Resolution:** All three legacy deployments set `resources.requests`, `resources.limits`, `readinessProbe` and `livenessProbe`.
- **Evidence:** `k8s/deployments/mainnet.yaml:34-47` (same block in `staging.yaml` and `testnet.yaml`)
- **Status:** Satisfied. The canonical tree is still `infra/k8s/` (see `k8s/README.md`).

## #1479: namespace names across the two trees

| Environment | `k8s/namespaces/` (deprecated) | `infra/k8s/overlays/*/kustomization.yaml` (canonical) |
|---|---|---|
| mainnet | `esustellar-mainnet` | `esustellar` |
| staging | `esustellar-staging` | `esustellar-staging` |
| testnet | `esustellar-testnet` | `esustellar-testnet` |

- **Resolution:** Staging and testnet match. **Mainnet differs:** the legacy tree uses `esustellar-mainnet`, while the canonical overlay, `infra/k8s/network-policies.yaml` and the monitoring policies all use `esustellar`. Because `k8s/README.md` marks `k8s/` as deprecated ("do not add or edit resources here"), the mainnet name to deploy and reference is **`esustellar`**. Applying `k8s/namespaces/mainnet.yaml` would create an unused namespace, so it must not be used for mainnet.
- **Status:** The mismatch is documented. Remove it when ADR 003 retires `k8s/`.

## #1480: `environments/testnet/k8s/`

- **Resolution:** That directory no longer exists on `main`. `infra/k8s/overlays/testnet/` is the only testnet manifest set, so there is no stale copy left to drift.
- **Status:** Satisfied.

## #1481: `rpc-alerts.yaml` in the configMapGenerator

- **Resolution:** `configMapGenerator.files` lists both `alert-rules.yaml` and `rpc-alerts.yaml`.
- **Evidence:** `infra/monitoring/prometheus/kustomization.yaml` (`configMapGenerator` → `prometheus-alert-rules`)
- **Status:** Satisfied.
