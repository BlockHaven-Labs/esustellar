# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                    Users / Browser                     │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────┐
│                 Next.js Frontend                       │
│  (apps/web) - SSG + Client-side interactions           │
└──────┬─────────────────────────────────┬─────────────┘
       │ Soroban SDK                       │ REST / WS
┌──────▼──────────────────┐   ┌───────────▼─────────────┐
│   Stellar Soroban RPC   │   │   Stellar Quickstart     │
│   (public / hosted)     │   │   (local dev)            │
└──────┬──────────────────┘   └───────────┬─────────────┘
       │                                  │
┌──────▼──────────────────────────────────▼─────────────┐
│                    Stellar Network                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Registry   │  │   Savings    │  │   Ephemeral   │ │
│  │   Contract   │  │   Contract   │  │   Account     │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Data Flow

1. User connects wallet (Freighter) via browser
2. Frontend reads contract IDs from `NEXT_PUBLIC_*` env vars
3. Contract calls are submitted via Soroban RPC
4. Registry contract tracks savings groups
5. Savings contract handles group lifecycle (create, join, contribute, payout)
6. Deployment via `deploy.sh` stores contract IDs in `.env.local`

## Deployment Pipeline

```
Developer Push → GitHub Actions → Docker Build (multi-arch)
    → GHCR Push → Production Server Pull → Container Restart
```
