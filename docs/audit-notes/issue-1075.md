# Issue #1075: nginx/ directory relationship to ingress-nginx

**Files audited:** `nginx/`, `infra/k8s/base/ingress.yaml`

## Finding
`infra/k8s/base/ingress.yaml` sets `ingressClassName: nginx`, implying
reliance on the cluster-installed ingress-nginx controller. The
top-level `nginx/` directory's config is separate from that
controller's config.

## Decision
Document that `nginx/` is for **local development / non-k8s deployment
paths only** and is not consumed by the in-cluster ingress-nginx
controller, which is configured entirely via
`infra/k8s/base/ingress.yaml` and the controller's own Helm values.

## Follow-up
Add a short README to `nginx/` stating this explicitly, in a focused
follow-up diff.
