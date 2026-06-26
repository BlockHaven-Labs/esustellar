# Changelog — infra/

All notable changes to the infrastructure directory are documented here.
This changelog follows the infra versioning strategy defined in `docs/infra-versioning.md`.

## [0.1.0] - 2026-06-26

### Added
- Base Kubernetes manifests for `apps/web` (Deployment, Service, Ingress)
- Kustomize overlays for testnet, staging, and mainnet
- Resource requests and limits for all pods
- Horizontal Pod Autoscaler for the web app
- Ingress with TLS termination via cert-manager + Let's Encrypt
- NetworkPolicies restricting pod-to-pod traffic
- Prometheus deployment with scrape targets
- Grafana deployment with Prometheus datasource
- Grafana dashboards for on-chain events and golden signals
- Alertmanager rule for web app uptime monitoring
- Documentation for compliance, mobile infra, and Stellar protocol upgrades
