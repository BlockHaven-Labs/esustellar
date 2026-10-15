# k8s/ (DEPRECATED, legacy flat manifests)

> **Do not add or edit resources here.** The canonical Kubernetes tree is
> `infra/k8s/` (Kustomize `base/` + `overlays/{mainnet,staging,testnet}`), as
> recorded in `infra/README.md` and `docs/adr/003-kubernetes-infrastructure-structure.md`.
> Per ADR 003, nothing here is deleted until the gaps below are closed.

This tree is plain per-environment YAML with no `kustomization.yaml`. Nothing in
`.github/workflows/` applies it (or `infra/k8s/`); manifests are applied manually.

## Why it still exists

`infra/k8s/` is not yet self-sufficient. Do not delete this directory until each
of these is migrated or confirmed unused in the live clusters:

| Still only here | Details |
|---|---|
| `config/*-configmap.yaml`, `config/*-secret.yaml` | Define `esustellar-config` and `esustellar-secrets`. The `infra/k8s` base Deployment instead reads ConfigMap `esustellar-web-config` and Secret `esustellar-web-secrets`, which are **not defined anywhere in this repo**. Confirm which names exist in each cluster before consolidating. |
| `namespaces/*.yaml` | `infra/k8s` overlays set a `namespace:` but contain no `Namespace` resource. |
| `monitoring/` | Only Kubernetes-deployable Loki and Promtail manifests, plus the balance-exporter manifest that `infra/monitoring/prometheus/kustomization.yaml` still pulls in. See `monitoring/README.md`. |

`scripts/sync-contract-ids.sh` and `infra/scripts/validate-configmaps.py` still
read or write `config/`. `.github/workflows/secret-scanning.yml` scans this tree
because `config/*-secret.yaml` are literal Secret manifests.

## Duplicated and superseded

`deployments/*.yaml` and `web/` duplicate the web Deployment, HPA and Service now
owned by `infra/k8s/`. If they disagree with `infra/k8s/`, `infra/k8s/` wins.
