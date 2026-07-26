#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
    Vec,
};

/// Grace period after a round deadline before a member is marked defaulted, in seconds.
const GRACE_PERIOD_SECONDS: u64 = 259200; // 3 days

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ContributionTooLow = 1,
    InvalidMemberCount = 2,
    StartDateMustBeFuture = 3,
    GroupNotFound = 4,
    GroupNotAcceptingMembers = 5,
    GroupIsFull = 6,
    AlreadyMember = 7,
    GroupNotActive = 8,
    NotMember = 9,
    MemberDefaulted = 10,
    AlreadyPaidThisRound = 11,
    PaymentWindowClosed = 12,
    RecipientNotFound = 13,
    NoRecipientFound = 14,
    Overflow = 15,
    NotAdmin = 15,
    GroupNotOpen = 16,
    AdminOnly = 15,
    RateLimited = 16,
    NotAllPaid = 17,
    NoRefundAvailable = 15,
    RoundNotStalled = 16,
    StartDateTooFarInFuture = 17,
    GroupPaused = 15,
    StartDateAlreadyPassed = 16,
    ArithmeticOverflow = 15,
    DataExpired = 16,
    AlreadyInitialized = 15,
    MemberDataMissing = 27,
    ContributionTooHigh = 16,
    CatchUpRequired = 29,
    NotDefaulted = 28,
    InvalidRound = 18,
    GroupIsPrivate = 18,
    GroupIdAlreadyExists = 19,
    StringTooLong = 20,
}

pub const MIN_MEMBERS: u32 = 3;
pub const MAX_MEMBERS: u32 = 20;
pub const MIN_CONTRIBUTION: i128 = 10_000_000;
pub const MAX_CONTRIBUTION: i128 = 1_000_000_000_000;
pub const DEFAULT_PLATFORM_FEE_BPS: u32 = 200;
pub const GRACE_PERIOD_SECONDS: u64 = 259_200;
pub const MAX_START_TIMESTAMP_OFFSET: u64 = 31_536_000;
pub const GROUP_TTL_EXTEND: u32 = 6_312_000;
pub const PAGE_SIZE: u32 = 100;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GroupStatus {
    Open,
    Active,
    Completed,
    Paused,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MemberStatus {
    Active,
    PaidCurrentRound,
    Overdue,
    Defaulted,
    ReceivedPayout,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Frequency {
    Weekly,
    BiWeekly,
    Monthly,
}

#[contracttype]
#[derive(Clone)]
pub struct SavingsGroup {
    pub group_id: String,
    pub admin: Address,
    pub name: String,
    pub contribution_amount: i128,
    pub total_members: u32,
    pub frequency: Frequency,
    pub start_timestamp: u64,
    pub status: GroupStatus,
    pub is_public: bool,
    pub current_round: u32,
    pub platform_fee_percent: u32,
    pub treasury: Address,
    pub token_address: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
pub struct Member {
    pub address: Address,
    pub join_timestamp: u64,
    pub join_order: u32,
    pub status: MemberStatus,
    pub total_contributed: i128,
    pub has_received_payout: bool,
    pub payout_round: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Contribution {
    pub member: Address,
    pub amount: i128,
    pub round: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Payout {
    pub recipient: Address,
    pub amount: i128,
    pub round: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Group(String),
    Members(String),
    MemberData(String, Address),
    Contributions(String, u32),
    Payouts(String, u32),
    RoundDeadline(String, u32),
    MemberCount(String),
    AllGroups,
    UserGroups(Address),
    GroupPage(u32),
    GroupPageIndex,
    LastGroupTimestamp(Address),
    Initialized,
    Admin,
}

fn bump_group_keys(env: &Env, group_id: &String) {
    let keys: Vec<DataKey> = Vec::from_array(
        env,
        &[
            DataKey::Group(group_id.clone()),
            DataKey::Members(group_id.clone()),
            DataKey::MemberCount(group_id.clone()),
        ],
    );
    for key in keys.iter() {
        env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);
    }
}

fn bump_member_key(env: &Env, group_id: &String, member: &Address) {
    let key = DataKey::MemberData(group_id.clone(), member.clone());
    env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);
}

#[contract]
pub struct SavingsContract;

#[contractimpl]
impl SavingsContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Creates a new savings group with the specified parameters.
    ///
    /// # Preconditions
    /// - Caller must be the admin and authorize the transaction.
    /// - `group_id` must be unique and not already in use.
    /// - `contribution_amount` must be between `MIN_CONTRIBUTION` and `MAX_CONTRIBUTION`.
    /// - `total_members` must be between `MIN_MEMBERS` and `MAX_MEMBERS`.
    /// - `start_timestamp` must be in the future and within `MAX_START_TIMESTAMP_OFFSET` seconds.
    /// - Admin must not have created another group within the last 24 hours (rate limit).
    /// - `group_id` and `name` must not exceed 64 characters.
    ///
    /// # Errors
    /// - `Error::GroupIdAlreadyExists` if `group_id` is already taken.
    /// - `Error::StringTooLong` if `group_id` or `name` exceeds 64 characters.
    /// - `Error::RateLimited` if admin created a group in the last 24 hours.
    /// - `Error::ContributionTooLow` / `Error::ContributionTooHigh` if amount is out of bounds.
    /// - `Error::InvalidMemberCount` if `total_members` is outside the allowed range.
    /// - `Error::StartDateMustBeFuture` / `Error::StartDateTooFarInFuture` for invalid timestamps.
    ///
    /// # Behavior
    /// - Initializes the group in `Open` status with zero members.
    /// - Adds the admin as the first member.
    /// - Registers the group in the global groups list and the admin's user groups.
    /// - Publishes a `created` event.
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
    ) -> Result<SavingsGroup, Error> {
        admin.require_auth();

        // Reject reusing an existing group_id so a second call can't overwrite
        // an existing group's admin, members, and state.
        if env
            .storage()
            .persistent()
            .has(&DataKey::Group(group_id.clone()))
        {
            return Err(Error::GroupIdAlreadyExists);
        }

        // Bound string sizes to keep storage rent predictable.
        const MAX_STRING_LEN: u32 = 64;
        if group_id.len() > MAX_STRING_LEN || name.len() > MAX_STRING_LEN {
            return Err(Error::StringTooLong);
        }

        // Rate limit: max 1 group per address per 24 hours (86400 seconds)
        let last_timestamp: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::LastGroupTimestamp(admin.clone()))
            .unwrap_or(0);
        if env.ledger().timestamp() < last_timestamp + 86400 {
            return Err(Error::RateLimited);
        }

        if contribution_amount < MIN_CONTRIBUTION {
            return Err(Error::ContributionTooLow);
        }
        if contribution_amount > MAX_CONTRIBUTION {
            return Err(Error::ContributionTooHigh);
        }
        if total_members < MIN_MEMBERS || total_members > MAX_MEMBERS {
            return Err(Error::InvalidMemberCount);
        }
        if start_timestamp <= env.ledger().timestamp() {
            return Err(Error::StartDateMustBeFuture);
        }
        if start_timestamp > env.ledger().timestamp() + MAX_START_TIMESTAMP_OFFSET {
            return Err(Error::StartDateTooFarInFuture);
        }

        let group = SavingsGroup {
            group_id: group_id.clone(),
            admin: admin.clone(),
            name,
            contribution_amount,
            total_members,
            frequency,
            start_timestamp,
            status: GroupStatus::Open,
            is_public,
            current_round: 0,
            platform_fee_percent: DEFAULT_PLATFORM_FEE_BPS,
            treasury: treasury.clone(),
            token_address,
        };

        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);
        env.storage().persistent().extend_ttl(&DataKey::Group(group_id.clone()), GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        let members: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::Members(group_id.clone()), &members);
        env.storage().persistent().set(&DataKey::MemberCount(group_id.clone()), &0u32);
        env.storage().persistent().extend_ttl(&DataKey::Members(group_id.clone()), GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);
        env.storage().persistent().extend_ttl(&DataKey::MemberCount(group_id.clone()), GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // #669: AllGroups maintained in savings as canonical source; registry is a thin index
        let mut all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::AllGroups, &all_groups);

        env.storage().persistent().set(&DataKey::LastGroupTimestamp(admin.clone()), &env.ledger().timestamp());

        env.storage().persistent().set(&DataKey::LastGroupTimestamp(admin.clone()), &env.ledger().timestamp());

        let mut admin_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(admin.clone()))
            .unwrap_or(Vec::new(&env));
        admin_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::UserGroups(admin.clone()), &admin_groups);

        let members: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::Members(group_id.clone()), &members);
        env.storage().persistent().set(&DataKey::MemberCount(group_id.clone()), &0u32);
        env.storage().persistent().extend_ttl(&DataKey::Members(group_id.clone()), GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);
        env.storage().persistent().extend_ttl(&DataKey::MemberCount(group_id.clone()), GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        Self::add_admin_to_group(&env, admin.clone(), group_id.clone())?;

        env.events().publish(
            (symbol_short!("created"),),
            (group_id, contribution_amount, total_members),
        );

        Ok(group)
    }

    /// Joins an open savings group as a member.
    ///
    /// # Preconditions
    /// - Caller must authorize the transaction.
    /// - The group must exist and be in `Open` status.
    /// - The group's start timestamp must not have passed yet.
    /// - If the group is private, only the admin may join.
    /// - The member must not already be part of the group.
    /// - The group must not be full.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::GroupNotAcceptingMembers` if the group is not in `Open` status.
    /// - `Error::StartDateAlreadyPassed` if the current time is past the start timestamp.
    /// - `Error::GroupIsPrivate` if a non-admin tries to join a private group.
    /// - `Error::GroupIsFull` if the group has reached its maximum member count.
    /// - `Error::AlreadyMember` if the member is already part of the group.
    ///
    /// # Behavior
    /// - Adds the member to the group with `Active` status.
    /// - Increments the member count.
    /// - If the group reaches full capacity, transitions to `Active` status and initializes round 1.
    /// - Registers the group in the member's user groups list.
    /// - Publishes a `joined` event.
    pub fn join_group(env: Env, member: Address, group_id: String) -> Result<(), Error> {
        member.require_auth();

        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        bump_group_keys(&env, &group_id);

        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotAcceptingMembers);
        }
        if env.ledger().timestamp() >= group.start_timestamp {
            return Err(Error::StartDateAlreadyPassed);
        }

        // #617: enforce private groups — only the admin may join a non-public group.
        if !group.is_public && member != group.admin {
            return Err(Error::GroupIsPrivate);
        }

        if env.ledger().timestamp() >= group.start_timestamp {
            return Err(Error::StartDateAlreadyPassed);
        }

        let member_count: u32 = env
            .storage().persistent().get(&DataKey::MemberCount(group_id.clone()))
            .unwrap_or(0);

        if member_count >= group.total_members {
            return Err(Error::GroupIsFull);
        }

        if env.storage().persistent().has(&DataKey::MemberData(group_id.clone(), member.clone())) {
            return Err(Error::AlreadyMember);
        }

        let new_member = Member {
            address: member.clone(),
            join_timestamp: env.ledger().timestamp(),
            join_order: member_count,
            status: MemberStatus::Active,
            total_contributed: 0,
            has_received_payout: false,
            payout_round: 0,
        };

        env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &new_member);
        bump_member_key(&env, &group_id, &member);

        let mut members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));
        members.push_back(member.clone());
        env.storage().persistent().set(&DataKey::Members(group_id.clone()), &members);

        let new_count = member_count + 1;
        env.storage().persistent().set(&DataKey::MemberCount(group_id.clone()), &new_count);
        let new_count = Self::add_member_to_group(&env, &member, &group_id);

        let mut user_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(member.clone()))
            .unwrap_or(Vec::new(&env));
        user_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::UserGroups(member.clone()), &user_groups);

        // TODO (#670): Add cross-contract call to registry contract
        // When a registry contract address is configured, the savings contract should call:
        //   registry::Client::new(&env, &registry_addr).add_member(&group_id, &member)
        // This ensures the registry stays in sync with on-chain state automatically.

        if new_count == group.total_members {
            let mut group: SavingsGroup = env
                .storage()
                .persistent()
                .get(&DataKey::Group(group_id.clone()))
                .ok_or(Error::GroupNotFound)?;
            let mut group = group.clone();
            group.status = GroupStatus::Active;
            group.current_round = 1;
            env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

            let deadline = Self::calculate_deadline(&env, &group, 1);
            env.storage().persistent().set(&DataKey::RoundDeadline(group_id.clone(), 1), &deadline);
        }

        env.events().publish(
            (symbol_short!("joined"),),
            (member, new_count),
        );

        Ok(())
    }

    /// Cancel a group that is still open. Only the admin can cancel, and only
    /// before the group becomes active (all members joined and rounds started).
    /// Removes the group from global and per-user tracking, but does not delete
    /// storage entries for the group itself (they will be garbage-collected by
    /// the ledger).
    pub fn cancel_group(env: Env, caller: Address, group_id: String) -> Result<(), Error> {
        caller.require_auth();

        let group: SavingsGroup = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if caller != group.admin {
            return Err(Error::NotAdmin);
        }

        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotOpen);
        }

        // Remove from global groups list
        let mut all_groups: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        let mut idx: u32 = 0;
        while idx < all_groups.len() {
            if all_groups.get(idx).unwrap() == group_id {
                all_groups.remove(idx);
                break;
            }
            idx += 1;
        }
        env.storage()
            .persistent()
            .set(&DataKey::AllGroups, &all_groups);

        // Remove group from every member's UserGroups list
        let members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            let mut user_groups: Vec<String> = env
                .storage()
                .persistent()
                .get(&DataKey::UserGroups(member_addr.clone()))
                .unwrap_or(Vec::new(&env));
            let mut i: u32 = 0;
            while i < user_groups.len() {
                if user_groups.get(i).unwrap() == group_id {
                    user_groups.remove(i);
                    break;
                }
                i += 1;
            }
            env.storage()
                .persistent()
                .set(&DataKey::UserGroups(member_addr), &user_groups);
        }

        env.events()
            .publish((symbol_short!("cancelled"),), (caller, group_id));

        Ok(())
    }

    /// Contributes the required amount for the current round of an active group.
    ///
    /// # Preconditions
    /// - Caller must authorize the transaction.
    /// - The group must exist and be in `Active` status.
    /// - The caller must be a member of the group.
    /// - The member must not have already paid for the current round.
    /// - The member must not be in `Defaulted` status.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::GroupNotActive` if the group is not active.
    /// - `Error::NotMember` if the caller is not a member of the group.
    /// - `Error::MemberDefaulted` if the member has defaulted.
    /// - `Error::AlreadyPaidThisRound` if the member already paid for this round.
    /// - `Error::PaymentWindowClosed` if the current time is past the grace period after the deadline.
    /// - `Error::ArithmeticOverflow` if the contribution amount causes an overflow.
    ///
    /// # Behavior
    /// - Transfers tokens from the member to the contract if a token address is set.
    /// - Records the contribution and updates the member's status to `PaidCurrentRound`.
    /// - If the member pays after the deadline but within the grace period, status becomes `Overdue`.
    /// - If the grace period has passed, the member is marked as `Defaulted`.
    /// - If all members have paid, triggers payout distribution.
    /// - Publishes a `contrib` event.
    pub fn contribute(env: Env, member: Address, group_id: String) -> Result<(), Error> {
        member.require_auth();

        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        bump_group_keys(&env, &group_id);

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        let mut member_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member.clone()))
            .ok_or(Error::NotMember)?;

        if member_data.status == MemberStatus::Defaulted {
            return Err(Error::MemberDefaulted);
        }
        if member_data.status == MemberStatus::PaidCurrentRound {
            return Err(Error::AlreadyPaidThisRound);
        }

        let current_round = group.current_round;
        let deadline: u64 = env
            .storage().persistent().get(&DataKey::RoundDeadline(group_id.clone(), current_round))
            .unwrap_or(0);

        let deadline_with_grace = deadline
            .checked_add(GRACE_PERIOD_SECONDS)
            .ok_or(Error::Overflow)?;

        // AUDIT FIX (#740, #741): The original code wrote MemberStatus::Defaulted to
        // persistent storage and then returned Err(Error::PaymentWindowClosed). In
        // Soroban, returning Err causes the host to revert *all* storage writes made
        // within the same invocation, so that write was silently discarded and
        // MemberStatus::Defaulted was never actually set in production. The orphaned
        // write has been removed; late-contribution callers now get PaymentWindowClosed
        // and the separate mark_defaulted() admin function is responsible for
        // transitioning the member to Defaulted status.
        if env.ledger().timestamp() > deadline_with_grace {
            return Err(Error::PaymentWindowClosed);
        }

        if env.ledger().timestamp() > deadline {
            member_data.status = MemberStatus::Overdue;
            env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &member_data);
        }

        // #606: move real funds from the member into the contract's custody
        // when the group is denominated in a SEP-41 token.
        if let Some(token) = group.token_address.clone() {
            token::Client::new(&env, &token).transfer(
                &member,
                &env.current_contract_address(),
                &group.contribution_amount,
            );
        }

        let contribution = Contribution {
            member: member.clone(),
            amount: group.contribution_amount,
            round: current_round,
            timestamp: env.ledger().timestamp(),
        };

        let mut round_contributions: Vec<Contribution> = env
            .storage().persistent().get(&DataKey::Contributions(group_id.clone(), current_round))
            .unwrap_or(Vec::new(&env));
        round_contributions.push_back(contribution);
        env.storage().persistent().set(&DataKey::Contributions(group_id.clone(), current_round), &round_contributions);

        member_data.status = MemberStatus::PaidCurrentRound;
        member_data.total_contributed = member_data
            .total_contributed
            .checked_add(group.contribution_amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &member_data);
        bump_member_key(&env, &group_id, &member);

        env.events().publish(
            (symbol_short!("contrib"),),
            (member, group.contribution_amount, current_round),
        );

        if Self::all_members_paid(&env, group_id.clone(), current_round) {
            Self::distribute_payout(env, group_id)?;
        }

        Ok(())
    }

    /// Cancels an open savings group and marks it as completed.
    ///
    /// # Preconditions
    /// - Caller must be the admin and authorize the transaction.
    /// - The group must exist and be in `Open` status.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::AdminOnly` if the caller is not the group admin.
    /// - `Error::GroupNotAcceptingMembers` if the group is not in `Open` status.
    ///
    /// # Behavior
    /// - Sets the group status to `Completed`.
    /// - Publishes a `cancelled` event.
    pub fn cancel_group(env: Env, admin: Address, group_id: String) -> Result<(), Error> {
        admin.require_auth();

        let group_key = DataKey::Group(group_id.clone());
        let mut group: SavingsGroup = env
            .storage().persistent().get(&group_key)
            .ok_or(Error::GroupNotFound)?;

        if group.admin != admin {
            return Err(Error::AdminOnly);
        }
        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotAcceptingMembers);
        }

        group.status = GroupStatus::Completed;
        env.storage().persistent().set(&group_key, &group);

        env.events().publish((symbol_short!("cancelled"),), group_id);
        Ok(())
    }

    /// Forcefully ends the current round when the group has stalled past the grace period.
    ///
    /// # Preconditions
    /// - The group must exist and be in `Active` status.
    /// - The current time must be past the deadline plus the grace period (3 days).
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::GroupNotActive` if the group is not active.
    /// - `Error::RoundNotStalled` if the grace period has not yet elapsed.
    ///
    /// # Behavior
    /// - Marks all members with `Active` or `Overdue` status as `Defaulted`.
    /// - Distributes the payout to the eligible recipient.
    /// - Pauses the group after distributing the payout.
    /// - Publishes a `paused` event.
    pub fn force_end_round(env: Env, group_id: String) -> Result<(), Error> {
        let mut group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        let current_round = group.current_round;
        let deadline: u64 = env
            .storage().persistent().get(&DataKey::RoundDeadline(group_id.clone(), current_round))
            .unwrap_or(0);

        if env.ledger().timestamp() <= deadline + GRACE_PERIOD_SECONDS {
            return Err(Error::RoundNotStalled);
        }

        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            let mut member_data: Member = env
                .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
                .unwrap();

            if member_data.status == MemberStatus::Active
                || member_data.status == MemberStatus::Overdue
            {
                member_data.status = MemberStatus::Defaulted;
                env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member_addr), &member_data);
            if let Some(mut member_data) = env
                .storage()
                .persistent()
                .get::<DataKey, Member>(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
            {
                if member_data.status == MemberStatus::Active
                    || member_data.status == MemberStatus::Overdue
                {
                    member_data.status = MemberStatus::Defaulted;
                    env.storage()
                        .persistent()
                        .set(&DataKey::MemberData(group_id.clone(), member_addr), &member_data);
                }
            }
        }

        Self::distribute_payout(env, group_id.clone())?;

        group.status = GroupStatus::Paused;
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        env.events().publish((symbol_short!("paused"),), group_id);
        Ok(())
    }

    /// Pauses an active savings group.
    ///
    /// # Preconditions
    /// - Caller must be the admin and authorize the transaction.
    /// - The group must exist and be in `Active` status.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::AdminOnly` if the caller is not the group admin.
    /// - `Error::GroupNotActive` if the group is not active.
    ///
    /// # Behavior
    /// - Sets the group status to `Paused`.
    /// - Publishes a `paused` event.
    pub fn pause_group(env: Env, admin: Address, group_id: String) -> Result<(), Error> {
        admin.require_auth();

        let mut group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.admin != admin {
            return Err(Error::AdminOnly);
        }
        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        group.status = GroupStatus::Paused;
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        env.events().publish((symbol_short!("paused"),), group_id);
        Ok(())
    }

    /// Resumes a paused savings group.
    ///
    /// # Preconditions
    /// - Caller must be the admin and authorize the transaction.
    /// - The group must exist and be in `Paused` status.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::AdminOnly` if the caller is not the group admin.
    /// - `Error::GroupNotActive` if the group is not paused.
    ///
    /// # Behavior
    /// - Sets the group status back to `Active`.
    /// - Publishes a `resumed` event.
    pub fn resume_group(env: Env, admin: Address, group_id: String) -> Result<(), Error> {
        admin.require_auth();

        let mut group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.admin != admin {
            return Err(Error::AdminOnly);
        }
        if group.status != GroupStatus::Paused {
            return Err(Error::GroupNotActive);
        }

        group.status = GroupStatus::Active;
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        env.events().publish((symbol_short!("resumed"),), group_id);
        Ok(())
    }

    /// Removes a member from an open savings group.
    ///
    /// # Preconditions
    /// - Caller must be the admin and authorize the transaction.
    /// - The group must exist and be in `Open` status.
    /// - The member must be part of the group and have zero contributions.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::AdminOnly` if the caller is not the group admin.
    /// - `Error::GroupNotAcceptingMembers` if the group is not in `Open` status.
    /// - `Error::NotMember` if the specified member is not part of the group.
    /// - `Error::MemberDefaulted` if the member has already made contributions.
    ///
    /// # Behavior
    /// - Removes the member's data from storage.
    /// - Removes the member from the group's members list.
    /// - Decrements the member count.
    /// - Publishes a `removed` event.
    pub fn remove_member(
        env: Env,
        admin: Address,
        group_id: String,
        member: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.admin != admin {
            return Err(Error::AdminOnly);
        }
        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotAcceptingMembers);
        }

        let mut member_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member.clone()))
            .ok_or(Error::NotMember)?;

        if member_data.total_contributed > 0 {
            return Err(Error::MemberDefaulted);
        }

        env.storage().persistent().remove(&DataKey::MemberData(group_id.clone(), member.clone()));

        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        let mut new_members: Vec<Address> = Vec::new(&env);
        for m in members.iter() {
            if m != member {
                new_members.push_back(m);
            }
        }
        env.storage().persistent().set(&DataKey::Members(group_id.clone()), &new_members);

        let count: u32 = env
            .storage().persistent().get(&DataKey::MemberCount(group_id.clone()))
            .unwrap_or(0);
        if count > 0 {
            env.storage().persistent().set(&DataKey::MemberCount(group_id.clone()), &(count - 1));
        }

        env.events().publish((symbol_short!("removed"),), (group_id, member));
        Ok(())
    }

    /// Transfers admin rights of a savings group to a new address.
    ///
    /// # Preconditions
    /// - Caller must be the current admin and authorize the transaction.
    /// - The group must exist.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::AdminOnly` if the caller is not the current group admin.
    ///
    /// # Behavior
    /// - Updates the group's admin to the new address.
    /// - Adds the group to the new admin's user groups list.
    /// - Publishes an `adm_xfer` event.
    pub fn transfer_admin(
        env: Env,
        group_id: String,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        current_admin.require_auth();

        let mut group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.admin != current_admin {
            return Err(Error::AdminOnly);
        }

        group.admin = new_admin.clone();
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        let mut new_admin_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(new_admin.clone()))
            .unwrap_or(Vec::new(&env));
        new_admin_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::UserGroups(new_admin.clone()), &new_admin_groups);

        env.events().publish(
            (symbol_short!("adm_xfer"),),
            (group_id, current_admin, new_admin),
        );
        Ok(())
    }

    /// Allows a defaulted member to pay catch-up contributions and return to active status.
    ///
    /// # Preconditions
    /// - Caller must authorize the transaction.
    /// - The group must exist and be in `Active` status.
    /// - The caller must be a member of the group with `Defaulted` status.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::GroupNotActive` if the group is not active.
    /// - `Error::NotMember` if the caller is not a member of the group.
    /// - `Error::NotDefaulted` if the member is not in `Defaulted` status.
    /// - `Error::CatchUpRequired` if there are no missed rounds to catch up on.
    /// - `Error::ArithmeticOverflow` if the catch-up amount causes an overflow.
    ///
    /// # Behavior
    /// - Calculates the number of missed rounds since the last paid round.
    /// - Computes the catch-up amount as `contribution_amount * missed_rounds`.
    /// - Updates the member's total contributions and sets status back to `Active`.
    /// - Publishes a `cured` event with the catch-up amount and missed rounds.
    pub fn cure_default(
        env: Env,
        member: Address,
        group_id: String,
    ) -> Result<(), Error> {
        member.require_auth();

        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        let mut member_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member.clone()))
            .ok_or(Error::NotMember)?;

        if member_data.status != MemberStatus::Defaulted {
            return Err(Error::NotDefaulted);
        }

        let current_round = group.current_round;
        let last_paid_round = member_data.payout_round;

        let missed_rounds = if current_round > last_paid_round + 1 {
            current_round - last_paid_round - 1
        } else {
            0
        };

        if missed_rounds == 0 {
            return Err(Error::CatchUpRequired);
        }

        let catch_up_amount = group
            .contribution_amount
            .checked_mul(missed_rounds as i128)
            .ok_or(Error::ArithmeticOverflow)?;

        member_data.total_contributed = member_data
            .total_contributed
            .checked_add(catch_up_amount)
            .ok_or(Error::ArithmeticOverflow)?;
        member_data.status = MemberStatus::Active;

        env.storage().persistent().set(
            &DataKey::MemberData(group_id.clone(), member.clone()),
            &member_data,
        );
        bump_member_key(&env, &group_id, &member);

        env.events().publish(
            (symbol_short!("cured"),),
            (member, group_id, catch_up_amount, missed_rounds),
        );

        Ok(())
    }

    /// Retries payout distribution for the current round if all members have paid.
    ///
    /// # Preconditions
    /// - The group must exist and be in `Active` status.
    /// - All members must have contributed for the current round.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::GroupNotActive` if the group is not active.
    /// - `Error::NotAllPaid` if not all members have contributed.
    ///
    /// # Behavior
    /// - If payouts have already been distributed for the current round, returns early.
    /// - Otherwise, triggers the payout distribution for the current round.
    pub fn retry_distribution(env: Env, group_id: String) -> Result<(), Error> {
        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        let current_round = group.current_round;
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        let contributions: Vec<Contribution> = env
            .storage().persistent().get(&DataKey::Contributions(group_id.clone(), current_round))
            .unwrap_or(Vec::new(&env));

        if contributions.len() != members.len() {
            return Err(Error::NotAllPaid);
        }

        let existing_payouts: Vec<Payout> = env
            .storage().persistent().get(&DataKey::Payouts(group_id.clone(), current_round))
            .unwrap_or(Vec::new(&env));

        if !existing_payouts.is_empty() {
            return Ok(());
        }

        Self::distribute_payout(env, group_id)
    }

    /// Claims a refund for a member who contributed but did not receive a payout in a round.
    ///
    /// # Preconditions
    /// - Caller must authorize the transaction.
    /// - The group and member must exist.
    /// - The member must have contributed for the specified round.
    /// - The member must not have received a payout for that round.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::NotMember` if the caller is not a member of the group.
    /// - `Error::NoRefundAvailable` if the member did not contribute or already received a payout.
    ///
    /// # Behavior
    /// - Returns the contributed amount if the member is eligible for a refund.
    pub fn claim_refund(
        env: Env,
        member: Address,
        group_id: String,
        round: u32,
    ) -> Result<i128, Error> {
        member.require_auth();

        let _group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        let member_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member.clone()))
            .ok_or(Error::NotMember)?;

        let contributions: Vec<Contribution> = env
            .storage().persistent().get(&DataKey::Contributions(group_id.clone(), round))
            .unwrap_or(Vec::new(&env));

        let mut contributed_amount: i128 = 0;
        let mut found = false;
        for contrib in contributions.iter() {
            if contrib.member == member {
                contributed_amount = contrib.amount;
                found = true;
                break;
            }
        }

        if !found || contributed_amount == 0 {
            return Err(Error::NoRefundAvailable);
        }

        let payouts: Vec<Payout> = env
            .storage().persistent().get(&DataKey::Payouts(group_id.clone(), round))
            .unwrap_or(Vec::new(&env));

        for payout in payouts.iter() {
            if payout.recipient == member {
                return Err(Error::NoRefundAvailable);
            }
        }

        Ok(contributed_amount)
    }

    /// Marks a member as defaulted if the grace period for the current round has elapsed.
    ///
    /// # Preconditions
    /// - The group must exist and be in `Active` status.
    /// - The member must be part of the group.
    /// - The current time must be past the deadline plus the grace period.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::NotMember` if the member is not part of the group.
    /// - `Error::GroupNotActive` if the group is not active.
    ///
    /// # Behavior
    /// - If the member is already defaulted or has received a payout, returns early.
    /// - Sets the member's status to `Defaulted` if the grace period has elapsed.
    /// - Publishes a `defaulted` event with the member and current round.
    pub fn mark_defaulted(env: Env, member: Address, group_id: String) -> Result<(), Error> {
        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        let mut member_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member.clone()))
            .ok_or(Error::NotMember)?;

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        if member_data.status == MemberStatus::Defaulted
            || member_data.status == MemberStatus::ReceivedPayout
        {
            return Ok(());
        }

        let deadline: u64 = env
            .storage().persistent().get(&DataKey::RoundDeadline(group_id.clone(), group.current_round))
            .unwrap_or(0);

        if env.ledger().timestamp() > deadline + GRACE_PERIOD_SECONDS {
            member_data.status = MemberStatus::Defaulted;
            env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &member_data);

            env.events().publish(
                (symbol_short!("defaulted"),),
                (member, group.current_round),
            );
        }

        Ok(())
    }

    fn distribute_payout(env: Env, group_id: String) -> Result<(), Error> {
        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        let current_round = group.current_round;

        let total_pool = group
            .contribution_amount
            .checked_mul(group.total_members as i128)
            .ok_or(Error::ArithmeticOverflow)?;
        let platform_fee = (total_pool * (group.platform_fee_percent as i128)) / 10000;
        let payout_amount = total_pool
            .checked_sub(platform_fee)
            .ok_or(Error::ArithmeticOverflow)?;

        let recipient = Self::get_next_payout_recipient(&env, group_id.clone(), current_round)?;

        // #606: pay the recipient real funds from the contract's custody
        // when the group is denominated in a SEP-41 token.
        if let Some(token) = group.token_address.clone() {
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &recipient,
                &payout_amount,
            );
        }

        let payout = Payout {
            recipient: recipient.clone(),
            amount: payout_amount,
            round: current_round,
            timestamp: env.ledger().timestamp(),
        };

        let mut payouts: Vec<Payout> = env
            .storage().persistent().get(&DataKey::Payouts(group_id.clone(), current_round))
            .unwrap_or(Vec::new(&env));
        payouts.push_back(payout);
        env.storage().persistent().set(&DataKey::Payouts(group_id.clone(), current_round), &payouts);

        let mut recipient_data: Member = env
            .storage().persistent().get(&DataKey::MemberData(group_id.clone(), recipient.clone()))
            .ok_or(Error::RecipientNotFound)?;
        recipient_data.has_received_payout = true;
        recipient_data.payout_round = current_round;
        recipient_data.status = MemberStatus::ReceivedPayout;
        env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), recipient.clone()), &recipient_data);

        // #752: include group_id so the activity feed can attribute this payout
        env.events().publish(
            (symbol_short!("payout"),),
            (group_id.clone(), recipient, payout_amount, current_round),
        );

        Self::end_round(env, group_id, group)?;

        Ok(())
    }

    fn end_round(env: Env, group_id: String, mut group: SavingsGroup) -> Result<(), Error> {
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            if let Some(mut member_data) = env
                .storage()
                .persistent()
                .get::<DataKey, Member>(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
            {
                if member_data.status == MemberStatus::PaidCurrentRound {
                    member_data.status = MemberStatus::Active;
                }
                // Keep Defaulted and ReceivedPayout as is
            let mut member_data: Member = env
                .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
                .unwrap();

                env.storage()
                    .persistent()
                    .set(&DataKey::MemberData(group_id.clone(), member_addr), &member_data);
            }

            env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member_addr), &member_data);
        }

        if group.current_round >= group.total_members {
            group.status = GroupStatus::Completed;
        } else {
            group.current_round += 1;
            let deadline = Self::calculate_deadline(&env, &group, group.current_round);
            env.storage().persistent().set(&DataKey::RoundDeadline(group_id.clone(), group.current_round), &deadline);
        }

        env.storage().persistent().set(&DataKey::Group(group_id), &group);

        // #753: add group_id and wrap round number in a tuple for consistent shape
        let ended_round = if group.current_round > 0 { group.current_round - 1 } else { 0 };
        env.events().publish(
            (symbol_short!("round_end"),),
            (group_id.clone(), ended_round),
        );

        Ok(())
    }

    fn add_admin_to_group(env: &Env, member: Address, group_id: String) -> Result<(), Error> {
    // Helper functions

    /// Internal: create and persist a new member record, push to the members
    /// vec, and increment the member count. Returns the new member count.
    fn add_member_to_group(
        env: &Env,
        member: &Address,
        group_id: &String,
    ) -> u32 {
        let member_count: u32 = env
            .storage().persistent().get(&DataKey::MemberCount(group_id.clone()))
            .unwrap_or(0);

        let new_member = Member {
            address: member.clone(),
            join_timestamp: env.ledger().timestamp(),
            join_order: member_count,
            status: MemberStatus::Active,
            total_contributed: 0,
            has_received_payout: false,
            payout_round: 0,
        };

        env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &new_member);

        let mut members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));
        members.push_back(member.clone());
        env.storage().persistent().set(&DataKey::Members(group_id.clone()), &members);

        let new_count = member_count + 1;
        env.storage()
            .persistent()
            .set(&DataKey::MemberCount(group_id.clone()), &new_count);

        new_count
    }

    fn add_admin_to_group(env: &Env, member: Address, group_id: String) -> Result<(), Error> {
        // Guard: admin must not already be a member of this group
        if env
            .storage()
            .persistent()
            .has(&DataKey::MemberData(group_id.clone(), member.clone()))
        {
            return Err(Error::AlreadyMember);
        }

        let new_count = Self::add_member_to_group(env, &member, &group_id);

        env.events()
            .publish((symbol_short!("joined"),), (member, new_count));

        env.events().publish((symbol_short!("joined"),), (member, new_count));
        Ok(())
    }

    fn calculate_deadline(_env: &Env, group: &SavingsGroup, round: u32) -> u64 {
        let round_duration = match group.frequency {
            Frequency::Weekly => 604800,
            Frequency::BiWeekly => 1209600,
            Frequency::Monthly => 2592000,
        };
        group.start_timestamp + (round as u64 * round_duration)
    }

    fn all_members_paid(env: &Env, group_id: String, round: u32) -> bool {
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        let contributions: Vec<Contribution> = env
            .storage().persistent().get(&DataKey::Contributions(group_id, round))
            .unwrap_or(Vec::new(&env));

        contributions.len() == members.len()
    }

    // #634: Best-match payout selection avoids O(n) unwrap-in-a-loop by
    // using safe optional reads and picking the earliest eligible join_order.
    fn get_next_payout_recipient(env: &Env, group_id: String, round: u32) -> Result<Address, Error> {
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        let target_order = round - 1;
        let mut best: Option<(u32, Address)> = None;

        for member_addr in members.iter() {
            let data: Member = match env
                .storage().persistent().get::<DataKey, Member>(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
            {
                Some(d) => d,
                None => continue,
            };
            if let Some(member_data) = env
                .storage()
                .persistent()
                .get::<DataKey, Member>(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
            let member_data: Member = env
                .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
                .ok_or(Error::MemberDataMissing)?;

            if data.has_received_payout
                || data.status == MemberStatus::Defaulted
                || data.join_order < target_order
            {
                if member_data.has_received_payout
                    || member_data.status == MemberStatus::Defaulted
                    || member_data.join_order < target_order
                {
                    continue;
                }

                let is_better = match &best {
                    None => true,
                    Some((best_order, _)) => member_data.join_order < *best_order,
                };

                if is_better {
                    best = Some((member_data.join_order, member_addr.clone()));
                }
            }
        }

        match best {
            Some((_, addr)) => Ok(addr),
            None => Err(Error::NoRecipientFound),
        }
    }

    /// Retrieves a savings group by its ID.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    pub fn get_group(env: Env, group_id: String) -> Result<SavingsGroup, Error> {
        env.storage().persistent().get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)
    }

    /// Retrieves a member's data from a specific group.
    ///
    /// # Errors
    /// - `Error::NotMember` if the member is not part of the group.
    pub fn get_member(env: Env, member: Address, group_id: String) -> Result<Member, Error> {
        env.storage().persistent().get(&DataKey::MemberData(group_id, member))
            .ok_or(Error::NotMember)
    }

    /// Returns the list of all member addresses in a group.
    pub fn get_members(env: Env, group_id: String) -> Vec<Address> {
        env.storage().persistent().get(&DataKey::Members(group_id))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns all contributions made for a specific round of a group.
    pub fn get_round_contributions(env: Env, group_id: String, round: u32) -> Vec<Contribution> {
        env.storage().persistent().get(&DataKey::Contributions(group_id, round))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns all payouts distributed for a specific round of a group.
    pub fn get_round_payouts(env: Env, group_id: String, round: u32) -> Vec<Payout> {
        env.storage().persistent().get(&DataKey::Payouts(group_id, round))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns the deadline timestamp for a specific round of a group.
    ///
    /// # Errors
    /// - `Error::GroupNotFound` if the group does not exist.
    /// - `Error::InvalidRound` if the round is 0 or exceeds the total number of members.
    ///
    /// # Behavior
    /// - Returns the stored deadline if available, otherwise calculates it based on the group's frequency.
    pub fn get_round_deadline(env: Env, group_id: String, round: u32) -> Result<u64, Error> {
        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if round == 0 || round > group.total_members {
            return Err(Error::InvalidRound);
            return Err(Error::GroupNotFound);
        }

        if let Some(deadline) = env.storage().persistent().get(&DataKey::RoundDeadline(group_id.clone(), round)) {
            return Ok(deadline);
        }

        Ok(Self::calculate_deadline(&env, &group, round))
    }

    /// Returns all group IDs that a user is a member of.
    pub fn get_user_groups(env: Env, user: Address) -> Vec<String> {
        env.storage().persistent().get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns a paginated list of group IDs that a user is a member of.
    ///
    /// # Arguments
    /// - `page` - Zero-indexed page number.
    /// - `page_size` - Number of items per page.
    ///
    /// # Behavior
    /// - Returns an empty vector if the page is out of bounds.
    pub fn get_user_groups_page(env: Env, user: Address, page: u32, page_size: u32) -> Vec<String> {
        let all: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env));
        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, all.len() as usize);
        let mut result: Vec<String> = Vec::new(&env);
        if start < all.len() as usize {
            for i in start..end {
                if let Some(gid) = all.get(i as u32) {
                    result.push_back(gid);
                }
            }
        }
        result
    }

    /// Returns all group IDs registered in the contract.
    pub fn get_all_groups(env: Env) -> Vec<String> {
        env.storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns a paginated list of all group IDs registered in the contract.
    ///
    /// # Arguments
    /// - `page` - Zero-indexed page number.
    /// - `page_size` - Number of items per page.
    ///
    /// # Behavior
    /// - Returns an empty vector if the page is out of bounds.
    pub fn get_groups_page(env: Env, page: u32, page_size: u32) -> Vec<String> {
        let all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, all_groups.len() as usize);

        let mut result: Vec<String> = Vec::new(&env);
        if start < all_groups.len() as usize {
            for i in start..end {
                if let Some(group_id) = all_groups.get(i as u32) {
                    result.push_back(group_id);
                }
            }
        }
        result
    }

    /// Returns the total number of groups registered in the contract.
    pub fn get_group_total_count(env: Env) -> u32 {
        let all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.len()
    }
}

#[cfg(test)]
mod tests;

