# Kubernetes manifests

Two manifest trees exist:

| Tree | Role |
| ---- | ---- |
| `infra/k8s/base` + `infra/k8s/overlays/{mainnet,staging,testnet}` | Kustomize-based, authoritative for the web app. CI renders each overlay and checks Service selectors against Deployment labels (`k8s-overlay-validation.yml`). |
| `k8s/{namespaces,deployments,config,web,monitoring}` | Flat per-environment manifests (namespaces, config maps, placeholder secrets, monitoring). |

## Namespaces (#1232)

| Environment | `k8s/namespaces/*.yaml` | Kustomize overlay |
| ----------- | ----------------------- | ----------------- |
| testnet | `esustellar-testnet` | `esustellar-testnet` |
| staging | `esustellar-staging` | `esustellar-staging` |
| mainnet | `esustellar-mainnet` | `esustellar` (differs; `infra/k8s/network-policies.yaml` also targets `esustellar`) |
| monitoring | n/a | `esustellar-monitoring` |

The mainnet mismatch is existing behaviour; changing a live namespace requires a
planned migration, so it is documented rather than altered here.

## Flat deployments vs base (#1231)

`k8s/deployments/*.yaml` define resource requests/limits and readiness and
liveness probes, matching the structure of `infra/k8s/base/deployment.yaml`.
Keep resource values and probe paths in sync when editing either tree.

## `environments/testnet/k8s` (#1233)

`environments/testnet/` contains no `k8s/` directory, so there is no duplicate
of `infra/k8s/overlays/testnet`; the overlay is the only source of truth.
