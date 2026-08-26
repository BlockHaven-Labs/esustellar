# EsuStellar API Reference

## Overview

This directory contains the API reference documentation for EsuStellar's
smart contracts and off-chain services.

## Structure

```
docs/api-reference/
├── README.md              # This file
├── savings-contract.md    # Savings contract API
├── registry-contract.md   # Registry contract API
└── off-chain-api.md       # REST API for indexer/web app
```

## Smart Contract APIs

### Savings Contract (`contracts/savings/`)

| Method | Description |
|--------|-------------|
| `create_group` | Create a new savings group |
| `join_group` | Join an existing group |
| `contribute` | Make a contribution for the current round |
| `distribute_payout` | Trigger payout rotation (internal) |

See [savings-contract.md](./savings-contract.md) for full parameters.

### Registry Contract (`contracts/registry/`)

| Method | Description |
|--------|-------------|
| `register_group` | Register a group on-chain |
| `get_group_info` | Query group metadata |

See [registry-contract.md](./registry-contract.md) for full parameters.

## Off-chain API

The web app exposes REST endpoints for indexer queries:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups` | GET | List all groups |
| `/api/groups/:id` | GET | Get group details |
| `/api/groups/:id/members` | GET | List group members |
| `/api/health` | GET | Health check |

See [off-chain-api.md](./off-chain-api.md) for request/response schemas.

## Generating Docs

To regenerate from contract specs:

```bash
# From the contracts directory
stellar contract inspect contracts/savings/src/lib.rs
```

API docs are versioned alongside contract deployments.
Each major contract upgrade should include an updated doc set.

## Adding New Endpoints

1. Add documentation in the appropriate `.md` file
2. Include request/response examples
3. Update the summary table in this README
