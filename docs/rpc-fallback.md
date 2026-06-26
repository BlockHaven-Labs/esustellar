# Stellar RPC Endpoint Fallback Strategy

## Primary → Fallback Chain

1. **Primary**: Public Soroban RPC (`https://soroban-testnet.stellar.org`)
2. **Fallback 1**: Community-hosted RPC endpoint
3. **Fallback 2**: Local Stellar Quickstart container (`http://localhost:8000`)

## Implementation

The frontend reads `NEXT_PUBLIC_SOROBAN_RPC_URL` from env. For resilience:

- Configure a load balancer in front of multiple RPC endpoints
- Use the `@stellar/stellar-sdk` `Server` with a fallback URL list
- Monitor RPC health via a heartbeat check every 30s

## Health Checks

```bash
curl -s -X POST <rpc-url> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

If the health check fails twice consecutively, rotate to the next endpoint.

## Production Recommendation

Use a dedicated Stellar Quickstart instance behind an internal ALB rather than public RPC.
