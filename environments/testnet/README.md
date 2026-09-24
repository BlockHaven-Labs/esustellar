# EsuStellar Testnet Environment

> **ARCHIVED — Kubernetes tree removed.** The `k8s/` manifests that previously
> lived in this directory were removed (issue #1027): they duplicated
> `infra/k8s/overlays/testnet/` and had drifted out of sync (different image
> tag, replicas, resources, probes). `infra/k8s/overlays/testnet/` (kustomize)
> is the canonical, maintained testnet deployment. Use it via:
>
> ```bash
> kubectl kustomize infra/k8s/overlays/testnet | kubectl apply -f -
> ```
>
> This directory now covers contract deployment and Docker Compose only.

This directory contains the testnet workspace for Stellar Testnet contract deployments and supporting infrastructure.

## Directory Structure

```
environments/testnet/
├── README.md              # This file
├── docker-compose.yml     # Docker Compose configuration for testnet
├── config/                # Configuration files
│   ├── testnet.env       # Testnet environment variables
│   └── secrets.example   # Secrets template
├── scripts/               # Deployment and utility scripts
│   └── deploy.sh         # Contract deployment script
└── deployment-info.json   # Deployment metadata (created after deploy)
```

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- Node.js 20+
- kubectl (for Kubernetes deployment via `infra/k8s/overlays/testnet/`)
- Access to Stellar Testnet

## Quick Start

### 1. Setup Configuration

```bash
# Copy secrets template and fill in values
cd environments/testnet/config
cp secrets.example secrets/
# Edit secrets/ files with actual values
```

### 2. Deploy Contracts

```bash
# From repository root
cd environments/testnet
./scripts/deploy.sh
```

This will:
- Build the registry and savings contracts
- Generate/fund a deployer account on testnet
- Deploy both contracts to Stellar Testnet
- Update the frontend environment file
- Save deployment information to `deployment-info.json`

### 3. Start Services with Docker

```bash
cd environments/testnet
docker compose up --build
```

The web application will be available at `http://localhost:3000`

### 4. Deploy to Kubernetes

Archived — use the canonical kustomize overlay instead (see the note at the
top of this file):

```bash
kubectl kustomize infra/k8s/overlays/testnet | kubectl apply -f -
```

## Configuration

### Environment Variables

Key environment variables in `config/testnet.env`:

- `STELLAR_NETWORK`: Set to `testnet`
- `SOROBAN_RPC_URL`: Soroban RPC endpoint for testnet
- `HORIZON_URL`: Horizon API endpoint for testnet
- `NEXT_PUBLIC_REGISTRY_CONTRACT_ID`: Registry contract ID (populated by deploy script)
- `NEXT_PUBLIC_SAVINGS_CONTRACT_ID`: Savings contract ID (populated by deploy script)

### Secrets

Sensitive configuration should be stored in `config/secrets/`:

- `soroban_rpc_url.txt`: Custom RPC URL (if using non-default)
- `stellar_network_passphrase.txt`: Stellar network passphrase
- `stellar_seed.txt`: Stellar seed for local quickstart (if running local node)

## Deployment Script

The `scripts/deploy.sh` script handles the complete contract deployment process:

1. **Build Contracts**: Compiles Rust contracts to WASM
2. **Prepare Identity**: Generates/funds deployer account
3. **Deploy Registry**: Deploys the group registry contract
4. **Deploy Savings**: Deploys the savings contract
5. **Update Environment**: Updates frontend `.env.local` with contract IDs
6. **Save Metadata**: Records deployment information

## Kubernetes Deployment

**Archived (issue #1027).** This directory's Kubernetes manifests were
removed in favour of `infra/k8s/overlays/testnet/`, which is the canonical,
maintained configuration and is referenced by CI and the infrastructure docs.

Authoritative testnet Kubernetes resources:

- **Namespace**: `esustellar-testnet` (declared in `k8s/namespaces/testnet.yaml`)
- **ConfigMap / Secret**: `k8s/config/testnet-configmap.yaml`,
  `k8s/config/testnet-secret.yaml`
- **Deployment / Service / Ingress / HPA / Certificate**:
  `infra/k8s/base/*` assembled via `infra/k8s/overlays/testnet/kustomization.yaml`

## Post-Deployment

After deploying contracts:

1. **Verify Deployment**: Check `deployment-info.json` for contract IDs
2. **Update ConfigMap**: Update `k8s/config/testnet-configmap.yaml` with deployed contract IDs
3. **Test Contracts**: Use Stellar explorers to verify contract deployment
4. **Monitor Logs**: Check application logs for any connection issues

## Explorers

View deployed contracts on Stellar explorers:

- Registry: `https://stellar.expert/explorer/testnet/contract/<REGISTRY_ID>`
- Savings: `https://stellar.expert/explorer/testnet/contract/<SAVINGS_ID>`

## Troubleshooting

### Contract Deployment Fails

- Ensure Stellar CLI is installed: `stellar --version`
- Check network connectivity to Soroban RPC
- Verify deployer account has sufficient testnet XLM
- Use friendbot to fund account: `stellar keys fund deployer --network testnet`

### Docker Compose Issues

- Ensure Docker daemon is running
- Check port 3000 is not already in use
- Verify secrets files exist in `config/secrets/`

### Kubernetes Issues

- Verify kubectl is configured correctly
- Check namespace exists: `kubectl get namespace esustellar-testnet`
- View pod logs: `kubectl logs -n esustellar-testnet <pod-name>`
- Check pod status: `kubectl get pods -n esustellar-testnet`

## Cleanup

### Remove Docker Resources

```bash
cd environments/testnet
docker compose down -v
```

### Remove Kubernetes Resources

The archived `environments/testnet/k8s` manifests are gone. To delete the
testnet cluster resources that were previously created from them, tear down
by resource kind (or via the canonical overlay):

```bash
kubectl delete -n esustellar-testnet service esustellar-web
kubectl delete -n esustellar-testnet deployment esustellar-web
kubectl delete -n esustellar-testnet secret esustellar-secrets
kubectl delete -n esustellar-testnet configmap esustellar-config
kubectl delete namespace esustellar-testnet
```

## Related Documentation

- [Main Deployment Guide](../../../docs/deployment.md)
- [Infrastructure Overview](../../../docs/architecture.md)
- [Environment Variables](../../../docs/env-vars.md)
- [Docker Secrets](../../../docs/docker-secrets.md)
