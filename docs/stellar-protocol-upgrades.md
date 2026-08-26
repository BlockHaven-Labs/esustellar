# Stellar Protocol Upgrade Plan

## Overview
Stellar Network undergoes periodic protocol upgrades that may affect Soroban contract behaviour. This document outlines the process for monitoring, testing, and responding to protocol upgrades.

## Monitoring
- Subscribe to the [Stellar Developers](https://stellar.org/developers) newsletter and the [Stellar GitHub](https://github.com/stellar/stellar-protocol) repository.
- Monitor the Stellar Core release notes for protocol-bump proposals.

## Pre-Upgrade Checklist
1. Review the protocol change log and identify breaking changes (e.g. host-function signature changes, fee model adjustments).
2. For each breaking change:
   - Update Soroban SDK dependencies (`soroban-sdk`, `soroban-env`) in `contracts/`.
   - Run unit and integration tests against a testnet node running the new protocol version.
3. Deploy updated contracts to testnet and run end-to-end workflows.

## Testnet Validation
1. Wait for Stellar testnet (Futurenet) to be upgraded.
2. Run the full test suite:
   ```bash
   cargo test --workspace
   ```
3. Deploy contracts to testnet and verify group-creation, contribution, and payout flows.

## Mainnet Deployment
1. After validation passes on testnet, schedule a maintenance window.
2. Deploy updated contracts to mainnet.
3. Monitor on-chain events and error rates in Grafana.
4. If unexpected behaviour is detected, pause contract interaction and roll back to the previous contract version.

## Rollback Plan
- Contract upgrades are irreversible once authorised; test thoroughly before mainnet deployment.
- Maintain the previous contract code hash in documentation for reference.
- Consider a pause mechanism (admin-only) that can halt new group creation during an emergency.

## Responsibilities
- **Dev team**: implement contract changes and run tests.
- **DevOps**: monitor protocol upgrade announcements and coordinate maintenance windows.
- **QA**: validate all critical workflows on testnet before mainnet.
