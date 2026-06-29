# Deployment Process

## Overview

```
Developer Push → GitHub Actions → Build → Deploy
```

## Step-by-Step

### 1. Build Contracts

```bash
cd contracts/savings && stellar contract build
cd ../registry && stellar contract build
```

### 2. Deploy to Testnet

Using the dedicated testnet workspace:

```bash
cd environments/testnet
./scripts/deploy.sh
```

Or use the legacy root-level script:

```bash
STELLAR_NETWORK=testnet ./deploy.sh
```

### 3. Verify

- Check `deployment-info.json` for contract IDs
- Confirm `.env.local` is updated
- Run frontend health check

### 4. Docker Build & Push

```bash
docker build -t ghcr.io/blockhaven-labs/esustellar-web:latest .
docker push ghcr.io/blockhaven-labs/esustellar-web:latest
```

### 5. Production Deploy

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
