# Audit Issue Resolutions: Savings & Registry Contracts

This directory contains the resolutions for the following two security and accounting audit issues identified in the [BlockHaven-Labs/esustellar](https://github.com/BlockHaven-Labs/esustellar) repository.

---

## 1. [LOW] FeeCollected Event & Platform Fee Accounting

### Location
- `contracts/savings/src/lib.rs`: `distribute_payout`

### Root Cause
In `SavingsContract::distribute_payout`, the platform fee is calculated inline:
```rust
let total_pool = group
    .contribution_amount
    .checked_mul(group.total_members as i128)
    .ok_or(Error::ArithmeticOverflow)?;
let platform_fee = (total_pool * (group.platform_fee_percent as i128)) / 10000;
let payout_amount = total_pool
    .checked_sub(platform_fee)
    .ok_or(Error::ArithmeticOverflow)?;
```
However, the contract only published a single `payout` event recording the net `payout_amount`:
```rust
env.events().publish(
    (symbol_short!("payout"),),
    (group_id.clone(), recipient, payout_amount, current_round),
);
```
No separate event recorded `platform_fee`, nor was the fee transferred to `group.treasury` when SEP-41 token payments were enabled.

### Impact
1. **Lack of On-Chain Fee Audit Trail**: Off-chain indexers, subgraphs, and accounting pipelines cannot track cumulative platform revenue or distinguish gross contribution pools from net member payouts without re-executing business logic.
2. **Missing Fee Custody Transfer**: When SEP-41 tokens are used, the contract holds gross contributions but only transfers `payout_amount` to the member recipient; the `platform_fee` remained locked inside the contract instead of being routed to the designated `group.treasury`.

### Resolution & Implementation
1. **Dedicated `FeeCollected` Event (`fee_col`)**:
   When `platform_fee > 0`, the contract emits a distinct `fee_col` event containing the group ID, treasury destination address, collected fee amount, and current round:
   ```rust
   if platform_fee > 0 {
       env.events().publish(
           (symbol_short!("fee_col"),),
           (group_id.clone(), group.treasury.clone(), platform_fee, current_round),
       );
   }
   ```
2. **Treasury Token Transfer**:
   When `group.token_address` is present and `platform_fee > 0`, the contract transfers `platform_fee` directly to `group.treasury`:
   ```rust
   if let Some(token) = group.token_address.clone() {
       token::Client::new(env, &token).transfer(
           &env.current_contract_address(),
           &recipient,
           &payout_amount,
       );
       if platform_fee > 0 {
           token::Client::new(env, &token).transfer(
               &env.current_contract_address(),
               &group.treasury,
               &platform_fee,
           );
       }
   }
   ```

---

## 2. [LOW] Group ID Normalization & Collision Prevention

### Location
- `contracts/savings/src/lib.rs` (all public entrypoints accepting `group_id: String`)
- `contracts/registry/src/lib.rs` (`register_group` and registry indexing)

### Root Cause
Both `SavingsContract` and `GroupRegistry` accepted `group_id: String` as raw, unnormalized input. Strings such as `"MyGroup"`, `"mygroup"`, `" MyGroup"`, and `"mygroup  "` were treated as distinct, independently valid group identifiers with separate storage keys.

### Impact
1. **User Confusion & Search Failures**: Case-insensitive or whitespace-insensitive client UIs / indexing dashboards fail to locate groups if the user inputs a slightly different casing or adds whitespace.
2. **Phishing & Group Spoofing**: Malicious actors could register confusingly similar group IDs (e.g., `"MyGroup"` vs `"mygroup"`) to impersonate legitimate groups and mislead members.

### Resolution & Implementation
1. **`no_std` String Normalization Helper**:
   Implemented `normalize_group_id(&Env, &String) -> Result<String, Error>`:
   - Validates that the input is non-empty and does not exceed `MAX_STRING_LEN` (64 bytes).
   - Copies UTF-8 bytes into a stack-allocated buffer (`[u8; 64]`).
   - Trims leading and trailing ASCII whitespace.
   - Folds all ASCII uppercase letters (`'A'..='Z'`) to lowercase (`'a'..='z'`).
   - Rejects empty or whitespace-only inputs with `Error::InvalidGroupId`.
   - Returns a canonical normalized `soroban_sdk::String`.

   ```rust
   fn normalize_group_id(env: &Env, raw_id: &String) -> Result<String, Error> {
       const MAX_STRING_LEN: u32 = 64;
       let len = raw_id.len();
       if len == 0 {
           return Err(Error::InvalidGroupId);
       }
       if len > MAX_STRING_LEN {
           return Err(Error::StringTooLong);
       }

       let mut buf = [0u8; 64];
       let slice = &mut buf[..len as usize];
       raw_id.copy_into_slice(slice);

       let mut start = 0;
       while start < slice.len() && slice[start].is_ascii_whitespace() {
           start += 1;
       }

       let mut end = slice.len();
       while end > start && slice[end - 1].is_ascii_whitespace() {
           end -= 1;
       }

       let trimmed = &mut slice[start..end];
       if trimmed.is_empty() {
           return Err(Error::InvalidGroupId);
       }

       for b in trimmed.iter_mut() {
           *b = b.to_ascii_lowercase();
       }

       let normalized_str = core::str::from_utf8(trimmed).map_err(|_| Error::InvalidGroupId)?;
       Ok(String::from_str(env, normalized_str))
   }
   ```

2. **Applied Uniformly Across Contracts**:
   - In `SavingsContract`: Applied across `create_group`, `join_group`, `contribute`, `cancel_group`, `force_end_round`, `pause_group`, `resume_group`, `remove_member`, `transfer_admin`, `cure_default`, `retry_distribution`, `claim_refund`, `mark_defaulted`, `get_group`, `get_member`, `get_members`, `get_round_contributions`, `get_round_payouts`, and `get_round_deadline`.
   - In `GroupRegistry`: Applied across `register_group` and stored/indexed as canonical normalized ID.

---

## Directory Structure

```
issue-resolutions/
├── README.md
├── diffs/
│   ├── 01-fee-collected-event.patch
│   └── 02-group-id-normalization.patch
├── contracts/
│   ├── savings/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── tests.rs
│   └── registry/
│       ├── src/
│       │   ├── lib.rs
│       │   └── tests.rs
```
