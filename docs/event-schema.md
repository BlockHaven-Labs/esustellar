# Event Schema — SavingsContract

All events follow the shape `(topics_tuple, data_tuple)`.
Every event includes `group_id` as the first data element so off-chain
consumers (activity feeds, indexers) can attribute any event to its group.
# Reference: Issue #536
## Events

### `created`
Emitted when a new savings group is registered.

```
topics: (symbol_short!("created"),)
data:   (group_id: String, contribution_amount: i128, total_members: u32)
```

### `joined`
Emitted when a member (including the admin on group creation) joins a group.

```
topics: (symbol_short!("joined"),)
data:   (group_id: String, member: Address, join_order: u32)
```

### `contrib`
Emitted when a member successfully contributes for the current round.

```
topics: (symbol_short!("contrib"),)
data:   (group_id: String, member: Address, amount: i128, round: u32)
```

### `payout`
Emitted when a round's pool is disbursed to the round's recipient.

```
topics: (symbol_short!("payout"),)
data:   (group_id: String, recipient: Address, amount: i128, round: u32)
```

### `round_end`
Emitted at the close of every round.

```
topics: (symbol_short!("round_end"),)
data:   (group_id: String, ended_round: u32)
```

### `default`
Emitted when a member is marked as defaulted.

```
topics: (symbol_short!("default"),)
data:   (group_id: String, member: Address, round: u32)
```

### `cancelled`
Emitted when a group is cancelled before it becomes active.

```
topics: (symbol_short!("cancelled"),)
data:   (caller: Address, group_id: String)
```

## Notes

- All `symbol_short!` values must be ≤ 9 bytes (Soroban limit).
- `group_id` is always present so consumers can filter by group without
  cross-referencing additional state.
- `round` values are 1-indexed (round 1 is the first active round).
