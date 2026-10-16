# k8s/monitoring/ (DEPRECATED, see infra/monitoring/)

Canonical monitoring lives in `infra/monitoring/`. These manifests remain only
because `infra/monitoring/` has no Kubernetes equivalent yet:

- `loki.yaml`, `promtail.yaml`: the only Kubernetes-deployable Loki and Promtail
  (`infra/monitoring/loki` and `promtail` are Docker Compose configs).
  `docs/logging.md` still documents applying them.

`balance-exporter.yaml` used to live here too. It was referenced by
`infra/monitoring/prometheus/kustomization.yaml` via `../../../k8s/monitoring/`,
which reached outside the canonical `infra/` tree entirely and forced
`--load-restrictor LoadRestrictionsNone` on every build. As of #1122 it has been
moved to `infra/monitoring/prometheus/balance-exporter.yaml` and the
kustomization references it by a local, relative path.

Planned end state: move `loki.yaml` and `promtail.yaml` under
`infra/monitoring/`, repoint `docs/logging.md`, then delete this directory.