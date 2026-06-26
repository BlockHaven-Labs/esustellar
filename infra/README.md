# Infra Overview

## Prerequisites

- Docker & Docker Compose
- Stellar CLI (`cargo install stellar-cli --features opt`)
- Node.js 20+
- Access to Stellar testnet/mainnet RPC

## Quickstart

```bash
# 1. Install deps
npm install

# 2. Set up env vars
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with contract IDs and RPC URL

# 3. Deploy contracts
./deploy.sh

# 4. Start with Docker
docker compose up --build
```

## Directory Layout

```
infra/
├── README.md          ← this file
└── ...
docs/
├── architecture.md
├── env-vars.md
├── docker-secrets.md
├── deployment.md
├── rpc-fallback.md
├── cost-breakdown.md
├── on-call.md
├── backup-restore.md
├── incident-response.md
└── migration-checklist.md
.github/workflows/
├── docker-ci.yml
└── ghcr-publish.yml
```
