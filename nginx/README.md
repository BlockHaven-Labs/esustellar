# nginx/

Standalone reverse-proxy image used by the root `docker-compose.yml`
(`nginx` service) for local development and non-Kubernetes deployments.
It terminates TLS with certs from `nginx/certs/` and applies the rate
limits in `rate-limit.conf`.

## Relationship to Kubernetes

This config is **not** used on the cluster. `infra/k8s/base/ingress.yaml`
sets `ingressClassName: nginx`, which targets the cluster-installed
ingress-nginx controller and is configured through Ingress annotations,
not these files.
