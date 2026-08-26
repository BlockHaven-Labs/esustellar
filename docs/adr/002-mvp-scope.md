# ADR 002: MVP Scope — No Escrow, No Dispute Resolution

**Status:** Accepted

**Date:** 2025-06-15

## Context

The initial MVP needs to ship within a reasonable timeframe while
still providing value. The full feature set (escrow, dispute resolution,
configurable admin controls) would significantly increase scope and
audit requirements.

## Decision

The MVP will:

- Record contributions and payouts on-chain
- Use deterministic payout rotation based on join order
- NOT escrow funds within the contract
- NOT include dispute resolution
- NOT include configurable admin controls

Real token custody is deferred to a future release after the core
protocol is battle-tested.

## Consequences

### Positive

- Faster time to market
- Smaller attack surface for initial audit
- Simpler contract logic (easier to verify correctness)
- Users can still benefit from transparent on-chain records

### Negative

- No real financial protection until escrow is implemented
- Relies on social trust for actual fund transfers
- May lose users who need custody guarantees now

### Neutral

- The protocol can be extended later without breaking changes
- On-chain records provide audit trail even without escrow
