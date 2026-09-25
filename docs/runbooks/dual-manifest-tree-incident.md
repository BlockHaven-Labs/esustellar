# Dual Manifest-Tree Incident Runbook

**Scenario:** resources from both `infra/k8s/` and top-level `k8s/`
have been applied to the same cluster/namespace and are drifting
against each other.

## Diagnose
1. `kubectl get all -n <namespace> -o json | jq -r '.items[].metadata.labels'`
   and compare against `kustomize build infra/k8s/overlays/<env>` and
   `kustomize build k8s/overlays/<env>` output to see which resources
   came from which tree.
2. `kubectl diff -k infra/k8s/overlays/<env>` and
   `kubectl diff -k k8s/overlays/<env>` to see which tree the live
   state currently matches more closely.

## Recover
1. Pick a single source of truth (default: `infra/k8s/`, the
   Terraform-adjacent tree) and freeze changes to the other.
2. `kubectl apply -k infra/k8s/overlays/<env>` to converge state onto
   the chosen tree.
3. Delete any resources that only exist in the abandoned tree's output
   and are not referenced by the chosen tree.
4. Confirm via `kubectl diff -k infra/k8s/overlays/<env>` that the
   diff is empty.

## Prevent recurrence
Until the manifest-tree duplication is resolved at the source, gate
any `kubectl apply` in CI/scripts to only ever target
`infra/k8s/overlays/<env>`.
