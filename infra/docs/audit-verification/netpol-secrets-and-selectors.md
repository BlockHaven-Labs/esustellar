# Audit verification: egress default-deny, monitoring namespace, legacy secrets and Service selectors

For each issue below, this records where the requested behaviour already exists on `main`.
Evidence was gathered by reading files. Nothing was rendered or applied to a cluster.

## #1474: default-deny egress

- **Resolution:** `deny-all-egress` (empty `egress`) sits next to `deny-all-ingress`. Explicit allows are `allow-dns-egress` (53/UDP+TCP), `allow-only-api-egress` (443/80 plus the monitoring namespace) and nothing else.
- **Evidence:** `infra/k8s/network-policies.yaml:28` (`deny-all-egress`), plus the `allow-dns-egress` and `allow-only-api-egress` policies at the end of the file.
- **Status:** Satisfied.

## #1475: allow-monitoring namespace

- **Resolution:** `allow-monitoring` selects `kubernetes.io/metadata.name: esustellar-monitoring`. That is the namespace set by `infra/monitoring/prometheus/kustomization.yaml` (`namespace: esustellar-monitoring`), the canonical monitoring stack. Top-level `k8s/monitoring/` is the deprecated tree (see `k8s/README.md`).
- **Evidence:** `infra/k8s/network-policies.yaml:58-64`, `infra/monitoring/prometheus/kustomization.yaml:3`
- **Status:** Satisfied.

## #1476: `k8s/config/*-secret.yaml`

- **Resolution:** All three are plain `Secret`s, but they are explicitly marked as placeholder-only. They hold just the non-sensitive `NODE_ENV` via `stringData`, and their header says real values must be sealed with kubeseal first. `environments/testnet/k8s/` no longer exists. Real secrets go through `infra/secrets/` and are checked by `.github/workflows/validate-sealed-secrets.yml`.
- **Evidence:** `k8s/config/{mainnet,staging,testnet}-secret.yaml:1-4`
- **Status:** Satisfied. No sensitive data is committed.

## #1477: Service selector vs Deployment labels after overlays

- **Resolution:** CI renders every overlay with `kubectl kustomize` and asserts that each Service selector matches the Deployment pod-template labels.
- **Evidence:** `.github/workflows/k8s-overlay-validation.yml:1-2,51-68`
- **Status:** Satisfied.
