# Savings Contract API Reference

## `create_group`

Creates a new savings group.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `admin` | `Address` | Address of the group creator |
| `contribution_amount` | `i128` | Fixed amount per round (in stroops) |
| `member_count` | `u32` | Number of members required |
| `frequency` | `Frequency` | Contribution frequency (Monthly, Weekly) |
| `start_date` | `u64` | Unix timestamp for first contribution |

**Returns:** `Group` struct

---

## `join_group`

Joins an existing open group.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `member` | `Address` | Address of the joining member |
| `group_id` | `BytesN<32>` | ID of the group to join |

**Returns:** `Member` struct

**Errors:**
- `GroupFull` — group already has maximum members
- `GroupNotOpen` — group is not accepting members
- `AlreadyMember` — address is already in the group

---

## `contribute`

Makes a contribution for the current round.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `contributor` | `Address` | Address making the contribution |
| `group_id` | `BytesN<32>` | ID of the group |

**Returns:** `Contribution` struct

**Errors:**
- `NotAMember` — address is not in the group
- `AlreadyContributed` — already contributed this round
- `WrongAmount` — amount doesn't match group's contribution_amount
- `NoActiveRound` — group is not in an active round
