# Contract Upgrade / Versioning ADR

> **Issue:** #869
> **Status:** Accepted
> **Date:** 2026-08-27

## Context

EsuStellar deploys two Soroban smart contracts — `savings` and `registry` — that manage
rotating savings groups on Stellar. As the platform evolves, bug fixes and feature
additions will require deploying updated contract code. We need a clear, safe process for
upgrading contracts without breaking existing live (Active) groups.

## Decision

**We use a new-deployment-only upgrade model**, coordinated through the
`MigrationCoordinator` contract, rather than Soroban's built-in contract upgrade
mechanism.

### Why not Soroban's built-in upgrade?

Soroban supports `stellar contract upgrade` which replaces the WASM of an already-deployed
contract address in-place. We chose not to rely on this for the following reasons:

1. **State migration risk**: If the new contract version changes storage layouts, data
   written by the old version may be unreadable or misinterpreted. In-place upgrades
   provide no built-in migration tooling.

2. **Replay risk**: A bugfix that changes validation logic could retroactively invalidate
   previously-valid state, causing existing groups to fail on subsequent interactions.

3. **Auditability**: New deployments produce a new contract address, making it trivial to
   distinguish old vs. new groups in explorers and indexers.

4. **Simplicity**: The MigrationCoordinator pattern gives frontends a single source of
   truth for which contract address to use, without needing to track upgrade history.

### The MigrationCoordinator pattern

The `MigrationCoordinator` contract acts as a version registry:

```
register_version(admin, "savings", "0.2.0", new_savings_address)
get_current("savings")  →  new_savings_address
```

- `get_current(name)` returns the latest non-deprecated contract address.
- Deprecated versions remain queryable for historical lookups but are flagged.
- Frontends and indexers query `get_current` to know which contract to interact with.

## Migration path for in-flight groups

When a new contract version is deployed:

1. **Deploy new contract**: The new savings contract is deployed at a fresh address.
2. **Initialize**: Call `initialize` on the new contract.
3. **Register version**: Call `register_version` on MigrationCoordinator with the new
   address.
4. **Existing groups continue on old contract**: Groups that are Active or Completed on
   the old contract remain there. Members continue contributing and receiving payouts
   through the old contract address until their group naturally completes.
5. **New groups use new contract**: Frontends use `get_current("savings")` to resolve
   the active contract address, so all newly created groups land on the latest version.
6. **Deprecate old version** (optional): Once all groups on the old contract have
   completed, call `deprecate_version` to signal to indexers that the old address is
   no longer active.

### In-flight group lifecycle

```
Group created on v0.1.0 ──────────────────────────┐
                                                    │
  Active: contribute, payout via v0.1.0 address     │
  ...all rounds complete...                         │
  Status: Completed                                 │
                                                    └─ Done, no migration needed
```

No data migration is required because:
- Each group's state lives within the contract's own storage.
- The old contract remains functional (it's not destroyed).
- The only thing that changes for users is which address the frontend points to.

## Deployment process (step-by-step)

### Prerequisites

- New contract WASM built and tested locally.
- All tests pass, including integration tests.
- Security review complete.

### Steps

1. **Build WASM**
   ```bash
   cd contracts/savings && stellar contract build
   ```

2. **Deploy new contract**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32v1-none/release/esustellar_savings.wasm \
     --source-account deployer \
     --network testnet
   # Note the new contract ID
   ```

3. **Initialize new contract**
   ```bash
   stellar contract invoke --id <NEW_CONTRACT_ID> -- initialize --admin <ADMIN>
   ```

4. **Register version in MigrationCoordinator**
   ```bash
   stellar contract invoke --id <MIGRATION_COORDINATOR_ID> -- \
     register_version --admin <ADMIN> \
     --contract_name savings \
     --version 0.2.0 \
     --address <NEW_CONTRACT_ID>
   ```

5. **Update frontend configuration**
   - Update `packages/shared/src/contracts.ts` with the new contract ID.
   - Or rely on `get_current("savings")` for dynamic resolution.

6. **Notify users**: Announce the upgrade. Existing groups are unaffected.

### Rolling back

If a critical bug is found in the new deployment:

1. **Do NOT destroy the new contract** (can't be done anyway in Soroban).
2. **Re-register the old address as current**:
   ```bash
   stellar contract invoke --id <MIGRATION_COORDINATOR_ID> -- \
     register_version --admin <ADMIN> \
     --contract_name savings \
     --version 0.1.0-hotfix \
     --address <OLD_CONTRACT_ID>
   ```
3. **Deprecate the new version**:
   ```bash
   stellar contract invoke --id <MIGRATION_COORDINATOR_ID> -- \
     deprecate_version --admin <ADMIN> \
     --contract_name savings \
     --version 0.2.0
   ```
4. **Frontends pick up the rollback** on next load via `get_current`.

## Frontend / indexer coordination

- **Frontends** should call `get_current("savings")` at startup (or cache with short
  TTL) to resolve the active contract address dynamically.
- **Indexers** should process events from all registered contract addresses, not just the
  current one, to maintain historical completeness.
- **SDK** should accept an optional contract address override, defaulting to the value
  from `get_current`.

## Consequences

### Positive
- No risk of in-place state corruption from upgrades.
- Clear separation between old and new groups.
- Historical groups remain fully functional on their original contract.
- Rollback is straightforward: just re-point the registry.

### Negative
- Live groups never "migrate" — they live out their lifecycle on the original contract.
  This means bug fixes only benefit newly created groups.
- Requires MigrationCoordinator contract deployment and maintenance.
- Slightly more storage cost (multiple contract deployments on-chain).

## Related

- MigrationCoordinator contract: `contracts/migration_coordinator/` (issue #845)
- Contract spec export: `scripts/export-contract-specs.sh` (issue #867)
