# Changelog

All notable changes to the EsuStellar smart contracts and platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Real token escrow / locked custody support in smart contracts.
- Configurable on-chain dispute resolution and arbitration workflows.
- Decentralized multi-sig admin controls..

---

## [0.1.0] - 2026-08-25

Current production contract release deployed on Stellar Testnet (`CONTRACT_VERSION = "0.1.0"`).

### Added
- **Contract Version Emission**: Contracts emit `CONTRACT_VERSION` (`"0.1.0"`) on `initialize(admin)` for on-chain schema and migration tracking (`#697`).
- **Namespaced Error Enums**:
  - `esustellar-savings` error codes partitioned to `1..=36` (e.g., `ContributionTooLow = 1`, `StringTooLong = 36`) (`#696`).
  - `esustellar-registry` error codes partitioned to `100..=104` (e.g., `GroupAlreadyRegistered = 100`, `InvalidAddress = 104`) to prevent cross-contract error code ambiguity (`#696`).
- **Admin & Lifecycle Management Functions (`contracts/savings`)**:
  - `pause_group(env, admin, group_id) -> Result<(), Error>`: Pause group activities during emergencies.
  - `resume_group(env, admin, group_id) -> Result<(), Error>`: Resume a paused group.
  - `cancel_group(env, caller, group_id) -> Result<(), Error>`: Cancel an open/unstarted group with full refunds.
  - `force_end_round(env, group_id) -> Result<(), Error>`: Admin intervention for stalled rounds past deadline + grace period.
  - `claim_refund(env, member, group_id) -> Result<(), Error>`: Member refund claim for stalled or canceled rounds.
  - `transfer_admin(env, current_admin, new_admin, group_id) -> Result<(), Error>`: Transfer group ownership.
  - `remove_member(env, admin, member, group_id) -> Result<(), Error>`: Evict non-contributing members before round start.
  - `mark_defaulted(env, member, group_id) -> Result<(), Error>`: Explicit status transition for non-paying members.
  - `cure_default(env, member, group_id) -> Result<(), Error>`: Allows defaulted members to catch up on missed contributions.
  - `retry_distribution(env, group_id) -> Result<(), Error>`: Retry failed payout distribution without re-contributing.
- **Registry Synchronization (`contracts/registry`)**:
  - `update_group_info(env, contract_address, admin, name, is_public, total_members) -> Result<(), Error>`: Update mutable metadata for frontend synchronization.
  - `unregister_group(env, contract_address, admin) -> Result<(), Error>`: Deregister completed or deleted groups.
  - `get_group_total_count(env) -> u32` / `get_group_count(env) -> u32`: Total indexed group metrics.
  - Paginated discovery queries: `get_groups_page(env, page, page_size) -> Vec<String>` and `get_user_groups_page(env, user, page, page_size) -> Vec<String>`.

### Changed
- **`create_group` Signature Evolution (`contracts/savings`)**:
  - Full current signature:
    ```rust
    pub fn create_group(
        env: Env,
        admin: Address,
        group_id: String,
        name: String,
        contribution_amount: i128,
        total_members: u32,
        frequency: Frequency,
        start_timestamp: u64,
        is_public: bool,
        treasury: Address,
        token_address: Option<Address>,
    ) -> Result<SavingsGroup, Error>
    ```
  - **Parameters Added**:
    - `is_public: bool`: Specifies whether the savings group is discoverable/open or private (invite-only).
    - `treasury: Address`: Dedicated address for collecting protocol platform fees.
    - `token_address: Option<Address>`: Optional SEP-41 token contract address for multi-asset pool support (defaults to native XLM if `None`).
  - **Return Type Changed**: Returns `Result<SavingsGroup, Error>` with initialized group metadata rather than `Result<(), Error>`.
  - **Validation Constraints**:
    - Contribution range enforcement: `MIN_CONTRIBUTION` (10 XLM / `10_000_000` stroops) to `MAX_CONTRIBUTION` (`1_000_000_000_000` stroops).
    - Member bounds: `MIN_MEMBERS` (3) to `MAX_MEMBERS` (20).
    - String length limits: `group_id` and `name` capped at 64 characters (`Error::StringTooLong`).
    - Start date validation: Must be in future, capped at `MAX_START_TIMESTAMP_OFFSET` (1 year / 31,536,000 seconds).
    - Rate limit: 24-hour cooldown per admin address for group creation (`Error::RateLimited`).
    - Duplicate check: Explicit rejection if `group_id` already exists (`Error::GroupIdAlreadyExists`).
- **`add_member` Return Type (`contracts/registry`)**:
  - Changed from `Result<(), Error>` to `Result<bool, Error>` to provide idempotent status (`true` if newly registered, `false` if already present) (`#666`).
- **Cross-Contract Verification in Registry (`contracts/registry`)**:
  - `register_group` now calls `SavingsContractClient::try_get_group` to cryptographically verify the deployed contract instance and admin ownership before registration.
- **Event Schema Enhancements**:
  - Added `group_id` to event topics across all lifecycle events (`joined`, `contrib`, `payout`, `round_end`, `reg_group`, `add_mem`, `rm_mem`).

### Security
- **PRNG Payout Order Randomization (`#744`, `#745`, `#746`, `#747`)**:
  - Replaced deterministic join-order payout rotation (`join_order == round - 1`) with Fisher-Yates shuffle seeded by ledger PRNG (`SavingsGroup.payout_order: Vec<u32>`) generated when group transitions to `Active`.
  - Eliminates admin-first rug-pull attack where organizer guaranteed round 1 payout and abandoned subsequent rounds.
- **Write-Then-Revert Guard (`#740`, `#741`, `#742`, `#743`)**:
  - Removed state mutation writes prior to error returns to conform to Soroban atomic transaction rollbacks.
- **Deadline Overflow Protection (`#626`)**:
  - Added explicit checked arithmetic guards for `deadline + GRACE_PERIOD_SECONDS` calculations.

---

## [0.0.3] - 2026-07-20

### Added
- Multi-group per contract deployment architecture.
- `is_public` boolean flag for access control and private savings groups.
- `treasury` address and `token_address` parameters in group configuration.
- Initial `GroupRegistry` contract for group discovery and metadata indexing.
- Storage TTL extension helpers (`bump_group_keys`, `bump_member_key`).

### Changed
- All savings contract functions updated to require `group_id: String` parameter.
- Upgraded `create_group` return type from `()` to `SavingsGroup`.

---

## [0.0.2] - 2026-01-15

### Added
- View functions for round deadlines (`get_round_deadline`) and contribution history.
- Member status tracking (`MemberStatus::Overdue`, `MemberStatus::Defaulted`, `MemberStatus::ReceivedPayout`).
- Initial test suite for multi-round lifecycle verification.

---

## [0.0.1] - 2025-12-28

### Added
- Initial Soroban smart contract prototype for rotating savings and credit associations (ROSCA / Esusu).
- Core methods: `create_group`, `join_group`, `contribute`, and internal `distribute_payout`.
- Single group per deployed contract instance.
- Fixed monthly/weekly/bi-weekly contribution frequency enum.
