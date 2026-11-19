# Dual Manifest-Tree Incident Runbook

**Scenario:** resources from both `infra/k8s/` and top-level `k8s/`
have been applied to the same cluster/namespace and are drifting
against each other.

This is a real risk today: the canonical Kustomize tree
(`infra/k8s/base` + `infra/k8s/overlays/<env>`) and the legacy flat tree
(`k8s/deployments/*.yaml`, `k8s/web/`, `k8s/config/`) both define an
`esustellar-web` Deployment. The legacy tree has no overlays and uses
different namespaces (`esustellar-{testnet,staging,mainnet}` vs the
overlay namespaces), so "applied both" can mean either overlapping
resources in one namespace or two Deployments with the same name in
different namespaces. Treat both as the same incident.

## Symptoms / detection signals

- Two Deployments named `esustellar-web` in different namespaces, or
  repeated apply errors (`Invalid value: ... field is immutable`) when
  switching between the two trees.
- `kubectl rollout status` succeeds but traffic still hits an older
  image/config, because the other tree's Service/Ingress selects the same
  pods or owns the endpoint.
- ConfigMap values (`NEXT_PUBLIC_*_CONTRACT_ID`) differ from the values in
  the overlay render or in `deployment-info.json`.
- Pod labels disagree: the canonical tree adds
  `app.kubernetes.io/part-of=esustellar` and
  `app.kubernetes.io/version=<tag>`; the flat tree does not.

## Diagnose

1. List every candidate resource and its image/config source:

   ```bash
   kubectl get deploy,svc,ing,cm -A -o wide | grep -E 'esustellar|NAMESPACE'
   kubectl get deploy -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}'
   ```

2. Render the canonical tree and compare it with the flat manifests:

   ```bash
   kustomize build infra/k8s/overlays/<env> > /tmp/canonical.yaml
   kubectl diff -k infra/k8s/overlays/<env>
   kubectl diff -f k8s/deployments/<env>.yaml
   diff <(kustomize build infra/k8s/overlays/<env>) k8s/deployments/<env>.yaml
   ```

   The legacy tree has no kustomize overlays; its files are the second
   input. Remember that mainnet's canonical namespace is `esustellar`,
   not `esustellar-mainnet` (see `infra/k8s/README.md`).

3. Identify which tree owns each live resource using labels and the
   last-applied configuration annotation:

   ```bash
   kubectl -n <namespace> get deploy esustellar-web -o json | \
     jq -r '.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"] // "<none>"'
   ```

   A `metadata.namespace` or `app.kubernetes.io/part-of` value that only
   one tree sets is enough to attribute ownership.

## Recover

1. Declare a single source of truth: `infra/k8s/overlays/<env>` (the
   Kustomize tree). Freeze all `kubectl apply` calls from `k8s/` and
   announce the freeze in the deployment channel.
2. Take a backup of the live state before changing anything:
   `kubectl -n <namespace> get all,cm,secret -o yaml > /tmp/pre-convergence.yaml`.
3. Scale down or delete the duplicate Deployment from the abandoned tree:

   ```bash
   kubectl -n <legacy-namespace> scale deploy/esustellar-web --replicas=0
   # or, once traffic has been confirmed to use the canonical tree:
   kubectl -n <legacy-namespace> delete deploy/esustellar-web
   ```

4. Converge the chosen tree:
   `kubectl apply -k infra/k8s/overlays/<env>`.
5. Delete resources that exist only in the abandoned tree and are not
   referenced by the canonical render (compare against
   `/tmp/canonical.yaml`). Do not delete Secrets or PVCs without a
   separate data-recovery decision.
6. Verify:

   ```bash
   kubectl diff -k infra/k8s/overlays/<env>          # must be empty
   kubectl -n <namespace> rollout status deploy/esustellar-web
   kubectl get deploy -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\n"}{end}' | grep esustellar-web
   bash infra/scripts/validate-image-references.sh
   ```

   The last command catches the specific drift that caused this class of
   incident (different image repositories in the two trees).

## Prevent recurrence

Until the manifest-tree duplication is resolved at the source:

- Gate any `kubectl apply` in CI/scripts so it only targets
  `infra/k8s/overlays/<env>`. `infra/k8s/README.md` records which legacy
  paths must not be applied.
- Keep `k8s/` read-only for deployments; treat it as reference material
  pending deletion.
- Run `infra/scripts/validate-image-references.sh` in CI (wired into
  `k8s-overlay-validation.yml`) and keep ConfigMap placeholder validation
  (`infra/scripts/validate-configmaps.sh`) in the deploy path.
