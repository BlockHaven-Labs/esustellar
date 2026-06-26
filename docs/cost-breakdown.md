# Cost Breakdown

## Stellar Network Fees

| Item | Cost (testnet) | Cost (mainnet) |
|---|---|---|
| Contract deploy | Free | ~0.01 XLM |
| Create group | Free | ~0.005 XLM |
| Contribute | Free | ~0.001 XLM |
| Payout txn | Free | ~0.001 XLM |
| Account create | Free | 1 XLM (min balance) |

## Infrastructure

| Service | Estimated Monthly Cost |
|---|---|
| Container registry (GHCR) | Free (public) |
| Docker build minutes (GitHub Actions) | Free up to 2000 min/mo |
| VPS / Cloud VM (e.g. 2 vCPU, 4 GB) | ~$20–40 |
| Stellar Quickstart instance | ~$10–20 |
| Domain + SSL | ~$10–15 |

## Estimated Total: **$40–75/month** for a production deployment

## Cost Optimisation

- Use spot/preemptible VMs for non-critical instances
- Cache Docker layers to reduce build minutes
- Batch contract calls where possible
