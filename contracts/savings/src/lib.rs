#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

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
    AdminOnly = 15,
    RateLimited = 16,
    NotAllPaid = 17,
    NoRefundAvailable = 18,
    RoundNotStalled = 19,
    StartDateTooFarInFuture = 20,
    GroupPaused = 21,
    StartDateAlreadyPassed = 22,
    ArithmeticOverflow = 23,
    DataExpired = 24,
    AlreadyInitialized = 25,
    ContributionTooHigh = 26,
    MemberDataMissing = 27,
}

pub const MIN_MEMBERS: u32 = 3;
pub const MAX_MEMBERS: u32 = 20;
pub const MIN_CONTRIBUTION: i128 = 10_000_000;
pub const MAX_CONTRIBUTION: i128 = 1_000_000_000_000;
pub const DEFAULT_PLATFORM_FEE_BPS: u32 = 200;
pub const GRACE_PERIOD_SECONDS: u64 = 259_200;
pub const MAX_START_TIMESTAMP_OFFSET: u64 = 31_536_000;
pub const GROUP_TTL_EXTEND: u32 = 6312000;
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
    AdminGroups(String),
    Initialized,
    Admin,
    Treasury(String),
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

        let page_index: u32 = env
            .storage().persistent().get(&DataKey::GroupPageIndex).unwrap_or(0);
        let mut current_page: Vec<String> = env
            .storage().persistent().get(&DataKey::GroupPage(page_index))
            .unwrap_or(Vec::new(&env));

        let (mut page_to_write, final_index) = if current_page.len() >= PAGE_SIZE {
            let new_index = page_index + 1;
            env.storage().persistent().set(&DataKey::GroupPageIndex, &new_index);
            (Vec::new(&env), new_index)
        } else {
            (current_page, page_index)
        };
        page_to_write.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::GroupPage(final_index), &page_to_write);

        let mut all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::AllGroups, &all_groups);

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

        let mut user_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(member.clone()))
            .unwrap_or(Vec::new(&env));
        user_groups.push_back(group_id.clone());
        env.storage().persistent().set(&DataKey::UserGroups(member.clone()), &user_groups);

        if new_count == group.total_members {
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

        if env.ledger().timestamp() > deadline + GRACE_PERIOD_SECONDS {
            member_data.status = MemberStatus::Defaulted;
            env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &member_data);
            return Err(Error::PaymentWindowClosed);
        }

        if env.ledger().timestamp() > deadline {
            member_data.status = MemberStatus::Overdue;
            env.storage().persistent().set(&DataKey::MemberData(group_id.clone(), member.clone()), &member_data);
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

    pub fn cancel_group(env: Env, admin: Address, group_id: String) -> Result<(), Error> {
        admin.require_auth();

        let mut group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group.admin != admin {
            return Err(Error::AdminOnly);
        }
        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotAcceptingMembers);
        }

        group.status = GroupStatus::Completed;
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        env.events().publish((symbol_short!("cancelled"),), group_id);
        Ok(())
    }

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
            }
        }

        Self::distribute_payout(env, group_id.clone())?;

        group.status = GroupStatus::Paused;
        env.storage().persistent().set(&DataKey::Group(group_id.clone()), &group);

        env.events().publish((symbol_short!("paused"),), group_id);
        Ok(())
    }

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

        env.events().publish(
            (symbol_short!("payout"),),
            (recipient, payout_amount, current_round),
        );

        Self::end_round(env, group_id, group)?;

        Ok(())
    }

    fn end_round(env: Env, group_id: String, mut group: SavingsGroup) -> Result<(), Error> {
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            let mut member_data: Member = env
                .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
                .unwrap();

            if member_data.status == MemberStatus::PaidCurrentRound {
                member_data.status = MemberStatus::Active;
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

        env.events()
            .publish((symbol_short!("round_end"),), group.current_round - 1);

        Ok(())
    }

    fn add_admin_to_group(env: &Env, member: Address, group_id: String) -> Result<(), Error> {
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
        env.storage().persistent().set(&DataKey::MemberCount(group_id.clone()), &new_count);

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

    fn get_next_payout_recipient(env: &Env, group_id: String, round: u32) -> Result<Address, Error> {
        let members: Vec<Address> = env
            .storage().persistent().get(&DataKey::Members(group_id.clone()))
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            let member_data: Member = env
                .storage().persistent().get(&DataKey::MemberData(group_id.clone(), member_addr.clone()))
                .ok_or(Error::MemberDataMissing)?;

            if member_data.join_order == round - 1 && !member_data.has_received_payout {
                return Ok(member_addr);
            }
        }

        Err(Error::NoRecipientFound)
    }

    pub fn get_group(env: Env, group_id: String) -> Result<SavingsGroup, Error> {
        env.storage().persistent().get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)
    }

    pub fn get_member(env: Env, member: Address, group_id: String) -> Result<Member, Error> {
        env.storage().persistent().get(&DataKey::MemberData(group_id, member))
            .ok_or(Error::NotMember)
    }

    pub fn get_members(env: Env, group_id: String) -> Vec<Address> {
        env.storage().persistent().get(&DataKey::Members(group_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_contributions(env: Env, group_id: String, round: u32) -> Vec<Contribution> {
        env.storage().persistent().get(&DataKey::Contributions(group_id, round))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_payouts(env: Env, group_id: String, round: u32) -> Vec<Payout> {
        env.storage().persistent().get(&DataKey::Payouts(group_id, round))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_deadline(env: Env, group_id: String, round: u32) -> Result<u64, Error> {
        let group: SavingsGroup = env
            .storage().persistent().get(&DataKey::Group(group_id.clone()))
            .ok_or(Error::GroupNotFound)?;

        if round == 0 || round > group.total_members {
            return Err(Error::GroupNotFound);
        }

        if let Some(deadline) = env.storage().persistent().get(&DataKey::RoundDeadline(group_id.clone(), round)) {
            return Ok(deadline);
        }

        Ok(Self::calculate_deadline(&env, &group, round))
    }

    pub fn get_user_groups(env: Env, user: Address) -> Vec<String> {
        env.storage().persistent().get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env))
    }

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

    pub fn get_all_groups(env: Env) -> Vec<String> {
        env.storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env))
    }

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

    pub fn get_group_total_count(env: Env) -> u32 {
        let all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.len()
    }

    pub fn get_groups_page_filtered(
        env: Env,
        page: u32,
        page_size: u32,
        admin: Option<Address>,
        min_members: Option<u32>,
        max_members: Option<u32>,
        is_public: Option<bool>,
    ) -> Vec<SavingsGroup> {
        let all_groups: Vec<String> = env
            .storage().persistent().get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let mut filtered: Vec<SavingsGroup> = Vec::new(&env);

        for gid in all_groups.iter() {
            if let Some(group) = env.storage().persistent().get::<DataKey, SavingsGroup>(&DataKey::Group(gid)) {
                let mut matches = true;
                if let Some(ref a) = admin {
                    if group.admin != *a { matches = false; }
                }
                if let Some(min) = min_members {
                    if group.total_members < min { matches = false; }
                }
                if let Some(max) = max_members {
                    if group.total_members > max { matches = false; }
                }
                if let Some(pub_flag) = is_public {
                    if group.is_public != pub_flag { matches = false; }
                }
                if matches {
                    filtered.push_back(group);
                }
            }
        }

        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, filtered.len() as usize);
        let mut result: Vec<SavingsGroup> = Vec::new(&env);
        if start < filtered.len() as usize {
            for i in start..end {
                if let Some(g) = filtered.get(i as u32) {
                    result.push_back(g);
                }
            }
        }
        result
    }

    pub fn get_user_groups_count(env: Env, user: Address) -> u32 {
        let all: Vec<String> = env
            .storage().persistent().get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env));
        all.len()
    }
}

#[cfg(test)]
mod tests;
