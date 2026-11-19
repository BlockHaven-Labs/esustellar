# Audit verification: Kubernetes overlay replica/HPA behaviour, overlay CI check and Loki retention

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1309 — mainnet `replicas: 3` vs base HPA `minReplicas: 2`

- **Resolution:** Mainnet overlay patches the HPA floor to match its baseline.
- **Evidence:** `infra/k8s/overlays/mainnet/kustomization.yaml:11-17` (comment and `count: 3`), `:25` (`/spec/minReplicas` replace, value 3); base HPA `infra/k8s/base/hpa.yaml` (`minReplicas: 2`)
- **Status:** Satisfied. Keep `count` and the HPA `minReplicas` in sync; the overlay comment says so.

## #1310 — testnet `replicas: 1` and rolling-update downtime

- **Resolution:** Testnet's single replica is a documented, deliberate tradeoff and deploys cannot drop to zero ready pods.
- **Evidence:** `infra/k8s/overlays/testnet/kustomization.yaml:11-19` (tradeoff comment, `maxUnavailable: 0` / `maxSurge: 1`), `:22` (`count: 1`), HPA floor patched to 1
- **Status:** Satisfied. The issue's `mobile-e2e.yml`/`e2e-web.yml` flake concern is addressed by `maxUnavailable: 0` (the new pod must be ready before the old one is removed).

## #1311 — CI check that overlay patches still apply

- **Resolution:** A workflow renders every overlay and asserts the patched env vars and structure.
- **Evidence:** `.github/workflows/k8s-overlay-validation.yml:27` (job), `:134-143` (asserts `NEXT_PUBLIC_NETWORK`/`STELLAR_NETWORK` values on the `web` container), `:146-150` (envFrom preserved), `:153-` (PodDisruptionBudget survives the render)
- **Status:** Satisfied. A base edit that moves `containers[0]` fails the job with a message pointing at `infra/k8s/base/deployment.yaml`.

## #1312 — Loki log retention

- **Resolution:** Retention is explicit, not indefinite.
- **Evidence:** `infra/monitoring/loki/loki-config.yaml:39` (`retention_period: 720h`, 30 days), `:50` (`retention_enabled: true`, compactor block at `:47-52`)
- **Status:** Satisfied. Matches the 30-day `RETENTION_DAYS` used for database backups (`infra/backups/backup-indexer.sh:32`).

