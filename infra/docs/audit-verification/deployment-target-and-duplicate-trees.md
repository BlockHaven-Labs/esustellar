# Audit verification: Deployment target statement, ECS observability, duplicate k8s and monitoring trees

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1333 — ECS-level observability

- **Resolution:** ECS observability is documented as a legacy path with the steps it would need.
- **Evidence:** `infra/monitoring/ecs/README.md:1-12` (legacy, nothing runs on ECS), `:24` (Enable Container Insights), `:45` (Logs), `:70` (Application metrics)
- **Status:** Satisfied as documentation; no Terraform enables Container Insights because ECS is not deployed.

## #1334 — deployment target statement at the top of infra/README.md

- **Resolution:** The first lines of `infra/README.md` state the production target and its decision record.
- **Evidence:** `infra/README.md:1-15` (Kubernetes per ADR 003; Vercel template and ECS IAM scaffolding are not production paths), `infra/docs/secrets.md` (same statement)
- **Status:** Satisfied.

## #1432 — two Kubernetes manifest trees

- **Resolution:** The root `k8s/` tree is marked deprecated, and the canonical tree is named.
- **Evidence:** `k8s/README.md:1-12` (DEPRECATED, canonical `infra/k8s/`, why it still exists), `infra/README.md:56` (table row), `docs/runbooks/dual-manifest-tree-incident.md`
- **Status:** Partly satisfied. It is deprecated, not deleted: the README lists gaps that must close first, and nothing in `.github/workflows/` applies either tree, so 'which one production applies' is not answerable from CI.

## #1433 — two monitoring stacks

- **Resolution:** The root `monitoring/` tree is marked deprecated; Loki and Promtail configs moved to `infra/monitoring/`.
- **Evidence:** `monitoring/README.md:1-12` (DEPRECATED, only `balance-exporter/` remains), `infra/monitoring/loki/loki-config.yaml`, `infra/monitoring/promtail/promtail-config.yaml`, `infra/monitoring/prometheus/kustomization.yaml` (no cross-tree reference)
- **Status:** Partly satisfied. Consolidated except the exporter source, which the README says is still referenced.

