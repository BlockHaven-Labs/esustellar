# Deployment & Scripts Process

## Overview
# Reference: Issue #536
```
Developer Push → GitHub Actions → Build → Deploy → Smoke Test → Log Archiving
```

## Prerequisite: Terraform Remote State

Before deploying infrastructure with Terraform, bootstrap the remote state backend:

```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS region and bucket name
terraform init
terraform apply
```

This creates an S3 bucket (with versioning and encryption) and a DynamoDB table for state locking. All downstream Terraform configs use this remote backend automatically.

## Step-by-Step

### 1. Build Contracts

```bash
cd contracts/savings && stellar contract build
cd ../registry && stellar contract build
```

### 2. Deploy to Testnet

Using the deployment script:

```bash
./deploy.sh
```

`deploy.sh` automatically:
1. Builds both Registry and Savings contracts
2. Sets up identity and funds deployer
3. Deploys contracts to Stellar Testnet
4. Updates `apps/web/.env.local` and `deployment-info.json`
5. Runs the post-deploy contract smoke tests automatically

---

## 🧪 Post-Deploy Smoke Testing

After deployment, verify that contract functions are responding properly on-chain:

```bash
# Run via npm script
npm run smoke-test

# Or run directly with parameters
./scripts/post-deploy-smoke-test.sh \
  --registry <REGISTRY_CONTRACT_ID> \
  --savings <SAVINGS_CONTRACT_ID> \
  --network testnet
```

The smoke test verifies core endpoints on both contracts:
- `Registry`: `get_group_count`, `get_all_groups`, `get_all_public_groups`
- `Savings`: `get_all_groups`

---

## 📦 Contract Event Log Archiving

To query Stellar Horizon/Soroban RPC for contract events since the last run and append them to a local JSONL archive:

```bash
# Run via npm script
npm run export-events

# Or run directly with options
./scripts/export-contract-events.sh \
  --output logs/contract-events.jsonl \
  --checkpoint logs/.event_checkpoint.json
```

Outputs:
- Archive file: `logs/contract-events.jsonl`
- Checkpoint file: `logs/.event_checkpoint.json`

---

## 4. Docker Build & Push

```bash
docker build -t ghcr.io/blockhaven-labs/esustellar-web:latest .
docker push ghcr.io/blockhaven-labs/esustellar-web:latest
```

## 5. Production Deploy

```bash
ssh <production-host>
cd /opt/esustellar
docker compose pull
docker compose up -d
```

## Rollback

```bash
docker compose down
docker compose pull <previous-tag>
docker compose up -d
```

## CI Pipeline

The `.github/workflows/docker-ci.yml` workflow handles:
- Multi-arch Docker build (amd64 + arm64)
- Layer caching for fast rebuilds
- GHCR push on main branch pushes
