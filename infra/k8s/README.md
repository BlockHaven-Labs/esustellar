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

## Network policy to monitoring mapping (#1297)

`esustellar` runs a default-deny ingress policy. Scraping still works because
`infra/k8s/network-policies.yaml` contains an explicit exception:

| Policy | Namespace / selector | Port | Consumer |
|---|---|---|---|
| `deny-all-ingress` | all pods in `esustellar` | — | baseline deny |
| `allow-monitoring` | pods labelled `app: esustellar-web` from namespace `esustellar-monitoring` | 9464 | Prometheus `esustellar-web` scrape job |
| `allow-only-api-egress` monitoring leg | to namespace `esustellar-monitoring` (all ports) | any | return path for scrapes and Alertmanager traffic |

Prometheus's `kubernetes_sd_configs` is scoped to `namespaces: [esustellar]` and
its relabel rule rewrites every target to port `9464`, so the policy port and the
scrape port agree.

Verification after any policy change (do not assume the manifest is enough):

```bash
kubectl -n esustellar get netpol allow-monitoring -o yaml
kubectl -n esustellar-monitoring run netpol-probe --rm -it --image=curlimages/curl -- \
  curl -sS --max-time 5 http://esustellar-web.esustellar.svc.cluster.local:9464/metrics
kubectl -n esustellar-monitoring port-forward svc/prometheus 9090:9090
# check the `esustellar-web` target is UP at http://localhost:9090/targets
```

If the probe times out, check the namespace label
`kubernetes.io/metadata.name=esustellar-monitoring` and the pod label
`app=esustellar-web` before changing the policy.

## Ingress hosts and TLS (#1471, #1472)

The base Ingress and Certificate use the mainnet apex domain. Every overlay patches
them so each environment claims only its own hostname, matching the per-environment
record created by `infra/terraform/modules/dns` (`${environment}.${domain_name}`):

| Overlay | Ingress host and TLS host | TLS secret |
| ------- | ------------------------- | ---------- |
| mainnet | `esustellar.io` | `esustellar-web-tls` |
| staging | `staging.esustellar.io` | `esustellar-web-tls-staging` |
| testnet | `testnet.esustellar.io` | `esustellar-web-tls-testnet` |

TLS is **explicit-Certificate driven**: `infra/k8s/base/certificate.yaml` is the only
source of the TLS secret. The Ingress deliberately has no `cert-manager.io/cluster-issuer`
annotation, because with one cert-manager would also create its own Certificate for the
same secret and the two would fight over it. The Ingress `tls.secretName` must equal the
Certificate's `secretName` in every overlay.

`k8s-overlay-validation.yml` renders each overlay and fails if the Ingress host, the
TLS hosts or secret, or the Certificate `dnsNames` drift from the table above, or if an
issuer annotation appears on the Ingress.

## Autoscaling (#1473)

`infra/k8s/base/hpa.yaml` scales on CPU (70%) and memory (80%). The memory target is
measured against the 512Mi limit in the base Deployment, which is the likely constraint
for the Next.js server before CPU is. Request-rate or latency scaling needs a custom or
external metrics adapter, which this cluster does not provide, so it is not configured.
The overlay validation fails if the rendered HPA stops scaling on either `cpu` or `memory`.

## Staging network (#1470)

Staging targets the Stellar **testnet** on purpose: there is no separate staging network.
It differs from the testnet overlay by namespace, replica count, probe timing, hostname and
TLS secret, not by `NEXT_PUBLIC_NETWORK` / `STELLAR_NETWORK`. The overlay validation pins
the expected network for each overlay, so changing it is a deliberate edit to the workflow
matrix as well as the overlay.
