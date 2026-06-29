# EsuStellar Testnet Environment

This directory contains the complete testnet workspace for Stellar Testnet contract deployments and supporting infrastructure.

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
├── k8s/                   # Kubernetes manifests
│   ├── namespace.yaml    # Kubernetes namespace
│   ├── configmap.yaml    # Application configuration
│   ├── secret.yaml       # Kubernetes secrets template
│   ├── deployment.yaml   # Application deployment
│   └── service.yaml      # Service configuration
└── deployment-info.json   # Deployment metadata (created after deploy)
```

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- Node.js 20+
- kubectl (for Kubernetes deployment)
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

```bash
cd environments/testnet/k8s

# Create namespace
kubectl apply -f namespace.yaml

# Apply configuration (update contract IDs first)
kubectl apply -f configmap.yaml

# Apply secrets (update with actual values first)
kubectl apply -f secret.yaml

# Deploy application
kubectl apply -f deployment.yaml

# Create service
kubectl apply -f service.yaml
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

### Namespace

Creates the `esustellar-testnet` namespace with appropriate labels.

### ConfigMap

Contains non-sensitive configuration including:
- Network settings
- RPC endpoints
- Contract IDs (update after deployment)

### Secret

Contains sensitive data (base64-encoded):
- Node environment
- Stellar seeds
- Custom RPC credentials

### Deployment

Deploys the web application with:
- 1 replica (testnet)
- Resource limits
- Health checks
- Rolling update strategy

### Service

Exposes the application via LoadBalancer on port 80.

## Post-Deployment

After deploying contracts:

1. **Verify Deployment**: Check `deployment-info.json` for contract IDs
2. **Update ConfigMap**: Update `k8s/configmap.yaml` with deployed contract IDs
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

```bash
cd environments/testnet/k8s
kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
kubectl delete -f secret.yaml
kubectl delete -f configmap.yaml
kubectl delete -f namespace.yaml
```

## Related Documentation

- [Main Deployment Guide](../../../docs/deployment.md)
- [Infrastructure Overview](../../../docs/architecture.md)
- [Environment Variables](../../../docs/env-vars.md)
- [Docker Secrets](../../../docs/docker-secrets.md)
