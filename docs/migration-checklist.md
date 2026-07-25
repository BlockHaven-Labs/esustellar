# Testnet → Mainnet Migration Checklist

## Pre-Migration

- [ ] Run full test suite: `cargo test`
- [ ] Verify all contract deployments on testnet
- [ ] Audit `deploy.sh` for mainnet compatibility
- [ ] Create mainnet Stellar accounts with sufficient XLM balance
- [ ] Update `NEXT_PUBLIC_SOROBAN_RPC_URL` to mainnet endpoint
- [ ] Update `NEXT_PUBLIC_NETWORK_PASSPHRASE` to `Public Global Stellar Network ; September 2015`

## Migration Steps

- [ ] Build contracts for mainnet: `STELLAR_NETWORK=mainnet ./deploy.sh`
- [ ] Verify new contract IDs in `deployment-info.json`
- [ ] Update `.env.local` on production with new contract IDs
- [ ] Deploy Docker containers with updated env vars
- [ ] Test group creation on mainnet
- [ ] Test contribution flow on mainnet

## Post-Migration

- [ ] Monitor errors for 24 hrs
- [ ] Verify Stellar expert shows correct contract data
- [ ] Update docs/env-vars.md with mainnet values
- [ ] Archive testnet deployment info
