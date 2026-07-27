# Disaster Recovery Runbook

**Contract**: eSuStellar Soroban Savings/Registry
**Environment**: `{{ ENVIRONMENT }}`
**Last Updated**: July 2026

## Table of Contents

- [Overview](#overview)
- [RTO/RPO Targets](#rtorpo-targets)
- [Pre-Requisites](#pre-requisites)
- [Scenario 1: Contract Upgrade (Admin Key Rotation)](#scenario-1-contract-upgrade)
- [Scenario 2: Data Corruption or Erroneous State](#scenario-2-data-corruption)
- [Scenario 3: Lost Admin Key](#scenario-3-lost-admin-key)
- [Scenario 4: Full Network Migration](#scenario-4-network-migration)
- [Post-Recovery Validation](#post-recovery-validation)

---

## Overview

This runbook covers disaster recovery procedures for the eSuStellar Soroban smart contracts (savings + registry) deployed on Stellar. All recovery actions require admin authorization and should be performed during a maintenance window when possible.

## RTO/RPO Targets

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 2 hours |
| Recovery Point Objective (RPO) | 0 (no data loss for contract state) |
| Maximum Tolerable Downtime | 4 hours |

## Pre-Requisites

- Stellar CLI (`stellar`) installed and configured
- Admin private key securely accessible
- Access to the target network (testnet/staging/mainnet)
- Current contract WASM hashes documented in deployment-info.json
- Backup of all DataKey schemas and version information

---

## Scenario 1: Contract Upgrade (Admin Key Rotation)

**Trigger**: Key compromise, team member departure, or scheduled rotation.

### Steps

1. **Verify current admin**
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --source <NEW_ADMIN_SECRET> \
     --network <NETWORK> \
     -- get_admin
   ```

2. **Transfer admin to new key**
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --source <OLD_ADMIN_SECRET> \
     --network <NETWORK> \
     -- set_admin \
     --new_admin <NEW_ADMIN_ADDRESS>
   ```

3. **Verify new admin**
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --source <NEW_ADMIN_SECRET> \
     --network <NETWORK> \
     -- get_admin
   ```

4. **Rotate registry admin** (if both contracts share an admin)
   ```bash
   # Repeat steps 1-3 for the registry contract
   ```

5. **Update CI/CD secrets** with new admin key

6. **Document the rotation** in deployment history

---

## Scenario 2: Data Corruption or Erroneous State

**Trigger**: Incorrect payout distribution, stuck rounds, or corrupted member data.

### Steps

1. **Assess damage scope**
   ```bash
   # Check all active groups
   stellar contract invoke \
     --id <SAVINGS_CONTRACT_ID> \
     --source <ADMIN_SECRET> \
     --network <NETWORK> \
     -- get_all_groups

   # Check specific group state
   stellar contract invoke \
     --id <SAVINGS_CONTRACT_ID> \
     --source <ADMIN_SECRET> \
     --network <NETWORK> \
     -- get_group \
     --group_id <GROUP_ID>
   ```

2. **Emergency pause** (if applicable — add a pause mechanism)
   - For now: Admin can call `force_end_round` to halt stalled rounds

3. **Force end stalled rounds**
   ```bash
   stellar contract invoke \
     --id <SAVINGS_CONTRACT_ID> \
     --source <ADMIN_SECRET> \
     --network <NETWORK> \
     -- force_end_round \
     --admin <ADMIN_ADDRESS> \
     --group_id <GROUP_ID>
   ```

4. **Reset round data** (if needed, requires new version deployment)
   - Deploy new contract version with corrected state initialization
   - Use `CONTRACT_VERSION` constant to verify correct deployment

5. **Notify affected users** through official channels

---

## Scenario 3: Lost Admin Key

**Trigger**: Admin private key is lost or compromised with no rotation planned.

### Steps

1. **Verify admin key is truly lost**
   - Attempt recovery from hardware wallet backups
   - Check secure vault backups

2. **If governance token is available** (future enhancement):
   - Use multisig or governance contract to rotate admin

3. **If no recovery possible**:
   - Deploy a new contract instance
   - Migrate state using the registry contract
   - **Data loss risk**: All uncommitted contributions may be unrecoverable

4. **Deploy fresh contracts**
   ```bash
   stellar contract deploy \
     --wasm contracts/savings/target/soroban/savings_contract.wasm \
     --source <NEW_ADMIN_SECRET> \
     --network <NETWORK>
   ```

5. **Re-register all groups** via the registry contract

---

## Scenario 4: Full Network Migration

**Trigger**: Network upgrade, chain fork, or infrastructure migration.

### Steps

1. **Export current state**
   - Document all DataKey schemas and their values
   - Record all active group IDs and member lists
   - Export contribution history (if off-chain storage is used)

2. **Deploy new contracts on target network**
   ```bash
   stellar contract deploy \
     --wasm contracts/savings/target/soroban/savings_contract.wasm \
     --source <ADMIN_SECRET> \
     --network <TARGET_NETWORK>

   stellar contract deploy \
     --wasm contracts/registry/target/soroban/registry_contract.wasm \
     --source <ADMIN_SECRET> \
     --network <TARGET_NETWORK>
   ```

3. **Initialize new contracts**
   ```bash
   stellar contract invoke \
     --id <NEW_SAVINGS_ID> \
     --source <ADMIN_SECRET> \
     --network <TARGET_NETWORK> \
     -- initialize \
     --admin <ADMIN_ADDRESS>

   stellar contract invoke \
     --id <NEW_REGISTRY_ID> \
     --source <ADMIN_SECRET> \
     --network <TARGET_NETWORK> \
     -- initialize \
     --admin <ADMIN_ADDRESS>
   ```

4. **Migrate groups** (requires scripted registration)
   - Re-create each group with original parameters
   - Re-add members using `add_member`
   - Note: Contribution history cannot be migrated on-chain

5. **Update DNS, frontend, and SDK configurations** to point to new contract IDs

---

## Post-Recovery Validation

After any recovery procedure, verify:

- [ ] Admin key is correctly set
- [ ] All active groups are accessible via `get_group`
- [ ] Member counts match pre-recovery values
- [ ] Payout schedule is intact
- [ ] Registry contract reflects all registered groups
- [ ] Frontend can load group data without errors
- [ ] No error code collisions (savings: 1-99, registry: 100+)

```bash
# Quick validation script
echo "=== Savings Contract ==="
stellar contract invoke --id <SAVINGS_ID> --source <ADMIN> --network <NET> -- get_admin
stellar contract invoke --id <SAVINGS_ID> --source <ADMIN> --network <NET> -- get_all_groups

echo "=== Registry Contract ==="
stellar contract invoke --id <REGISTRY_ID> --source <ADMIN> --network <NET> -- get_all_registered_groups
```

---

## Escalation Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Primary Admin | _@esustellar.com | Immediate |
| Security Lead | _@esustellar.com | Within 1 hour |
| Infrastructure | _@esustellar.com | Within 4 hours |

---

*This runbook should be reviewed and updated after every deployment or major incident.*
