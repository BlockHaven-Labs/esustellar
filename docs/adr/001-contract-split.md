# ADR 001: Split Savings and Registry into Two Contracts

**Status:** Accepted

**Date:** 2025-06-01

## Context

EsuStellar needs to manage two distinct concerns:

1. Savings group lifecycle (create, join, contribute, payout)
2. On-chain registry/metadata (group info, member history)

Combining these in a single contract would create a monolithic contract
that's harder to audit, upgrade, and reason about.

## Decision

Split the system into two Soroban contracts:

- `contracts/savings/` — core savings group logic
- `contracts/registry/` — on-chain metadata and group registry

The savings contract calls into the registry contract to record
state changes, but each can be upgraded independently.

## Consequences

### Positive

- Cleaner separation of concerns
- Independent upgrade paths for each contract
- Smaller contract sizes (Soroban has metered compute)
- Easier to audit each contract in isolation

### Negative

- Cross-contract calls add slight latency and complexity
- Two contracts to deploy and manage instead of one
- Need to manage contract-to-contract authorization

### Neutral

- No change to the end-user experience
- Both contracts share the same Stellar network
