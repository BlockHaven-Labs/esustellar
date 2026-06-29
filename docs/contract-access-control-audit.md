# Soroban Contract Access Control Audit

**Date:** 2026-06-29  
**Contracts audited:** `contracts/savings` · `contracts/registry`  
**Auditor:** JudeDaniel6

---

## Summary

Both contracts enforce access control through Soroban's `Address::require_auth()` mechanism, which cryptographically verifies that the transaction was signed by the expected account. No unintended privileged paths were found.

---

## contracts/savings (`SavingsContract`)

### Admin-gated functions

| Function | Auth check | Notes |
|---|---|---|
| `create_group` | `admin.require_auth()` | Caller must sign as `admin`; admin auto-joins the group as first member |

### Member-gated functions (any group member)

| Function | Auth check | Notes |
|---|---|---|
| `join_group` | `member.require_auth()` | Only the joining address can call on their own behalf |
| `contribute` | `member.require_auth()` | Contribution recorded only for the authenticated member |

### Internal / private functions

| Function | Access | Notes |
|---|---|---|
| `distribute_payout` | `fn` (private) | Called automatically when all members pay; not externally callable |
| `add_admin_to_group` | `fn` (private) | Called only from `create_group` |
| `get_next_payout_recipient` | `fn` (private) | Read-only helper |
| `all_members_paid` | `fn` (private) | Read-only helper |
| `calculate_deadline` | `fn` (private) | Read-only helper |

### Read-only (unauthenticated) functions

`get_group`, `get_members`, `get_member`, `get_all_groups`, `get_user_groups`, `get_contributions`, `get_payouts`

### Findings

- ✅ **No pause/upgrade/emergency-drain function exists.** There is no privileged path to halt or drain a group by the admin after it becomes `Active`. This is consistent with the trustless design goal.
- ✅ **Payout recipient selection is deterministic** (sequential by `join_order`), not admin-controlled, preventing bias.
- ✅ **Admin cannot skip contributions.** `contribute` requires the caller to be a member and performs the same checks for all members including the admin.
- ⚠️ **No contract upgrade path.** The contract is immutable once deployed. While this strengthens trustlessness, it means bugs cannot be patched without redeploying and migrating groups. Recommend documenting this trade-off in `contracts/savings/README.md`.
- ⚠️ **Admin is auto-joined as member 0.** If the admin address is compromised, the attacker gains member rights (contribution, payout eligibility) but cannot access other members' funds or alter group parameters.

---

## contracts/registry (`GroupRegistry`)

### Admin-gated functions

| Function | Auth check | Notes |
|---|---|---|
| `register_group` | `admin.require_auth()` | Only the declared admin of a group can register it |

### Member-gated functions

| Function | Auth check | Notes |
|---|---|---|
| `add_member` | `member.require_auth()` | Users register themselves into a group's user mapping |

### Read-only (unauthenticated) functions

`get_all_public_groups`, `get_group_info`, `get_user_groups`, `get_group_count`

### Findings

- ✅ **Anyone can register a group** as long as they sign as `admin`. There is no global registry admin that could censor or revoke group registrations.
- ✅ **`add_member` is idempotent.** Calling it a second time for an already-registered member is a no-op (returns `Ok(())`), preventing duplicate entries.
- ⚠️ **No de-registration function.** Once registered, a group contract address cannot be removed from the registry. This is intentional for transparency but means stale/abandoned group entries accumulate over time.
- ⚠️ **Group info is self-reported.** The `name`, `is_public`, and `total_members` fields in `GroupInfo` are provided by the caller at registration time and not verified against the savings contract state. A malicious actor could register a group with misleading metadata. Recommend cross-validating against the savings contract in the frontend.

---

## Overall Risk Assessment

| Risk | Severity | Status |
|---|---|---|
| Unauthorised fund access | Critical | ✅ Not present |
| Admin rug-pull / drain | High | ✅ Not possible by design |
| Privilege escalation | High | ✅ Not present |
| Misleading registry metadata | Low | ⚠️ Noted; mitigate in frontend |
| No upgrade path for bug fixes | Medium | ⚠️ Documented trade-off |

---

## Recommendations

1. Add a note to `contracts/savings/README.md` explaining the immutability trade-off and the recommended redeployment procedure if a critical bug is found.
2. In the frontend (`apps/web`), cross-validate `GroupInfo.total_members` from the registry against the live savings contract before displaying group details.
3. Consider emitting a `Paused` event path in a future contract version to allow groups to be temporarily halted by unanimous member vote (not admin unilaterally).
