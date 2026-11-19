# k8s/config ConfigMaps (#1289, #1290)

Only `testnet-configmap.yaml` contains live values: the three IDs come from
`deployment-info.json` (`network: testnet`, deployed 2026-05-05). They must be
re-checked after every contract redeploy.

`mainnet-configmap.yaml` and `staging-configmap.yaml` are **templates**. They
carry `${...}` placeholders and the annotation
`esustellar.io/config-template: "true"`. No mainnet or staging contract IDs are
committed to this repository by design. Applying either file directly gives the
web app literal placeholder strings, which is the production-down failure mode
these changes are meant to prevent.

## Rendering a template

Supply the IDs from the deploy job's secrets, render to a temporary file, then
validate and apply only the rendered file:

```bash
export NEXT_PUBLIC_SAVINGS_CONTRACT_ID=C...
export NEXT_PUBLIC_REGISTRY_CONTRACT_ID=C...
export NEXT_PUBLIC_CONTRACT_ID=C...

bash infra/scripts/render-configmap.sh \
  k8s/config/mainnet-configmap.yaml /tmp/mainnet-configmap.yaml
python3 infra/scripts/validate-configmaps.py /tmp
kubectl apply -f /tmp/mainnet-configmap.yaml
```

Both validators (`validate-configmaps.sh`, which needs `yq`, and
`validate-configmaps.py`, which needs PyYAML) reject empty values, the old
"MUST BE POPULATED" text and any remaining `${...}` placeholder. The renderer
also refuses to write output if substitution is incomplete.

## Relationship to the canonical tree

`infra/k8s/` is the deployable workload tree (ADR 003 and ADR 004); these flat
ConfigMaps are reference/template material. The canonical overlays inject
configuration via `envFrom` ConfigMap and Secret references
(`infra/k8s/base/deployment.yaml`), so any rendered ConfigMap must use the name
`esustellar-config` and the target environment's namespace. Do not apply this
tree alongside `infra/k8s/` — see
`docs/runbooks/dual-manifest-tree-incident.md`.
