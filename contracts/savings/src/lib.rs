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
}

// Data structures
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GroupStatus {
    Open,      // Accepting members
    Active,    // All members joined, rounds in progress
    Completed, // All payouts distributed
    Paused,    // Temporarily stopped
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
    pub platform_fee_percent: u32, // in basis points (100 = 1%)
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

// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Group,
    Members,
    MemberData(Address),
    Contributions(u32), // by round
    Payouts(u32),       // by round
    RoundDeadline(u32),
    MemberCount,
}

#[contract]
pub struct SavingsContract;

#[contractimpl]
impl SavingsContract {
    /// Initialize a new savings group
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
    ) -> Result<SavingsGroup, Error> {
        admin.require_auth();

        // Validations
        if contribution_amount < 10_000_000 {
            // 10 XLM minimum (7 decimals)
            return Err(Error::ContributionTooLow);
        }
        if total_members < 3 || total_members > 20 {
            return Err(Error::InvalidMemberCount);
        }
        if start_timestamp <= env.ledger().timestamp() {
            return Err(Error::StartDateMustBeFuture);
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
            platform_fee_percent: 200, // 2%
        };

        env.storage().instance().set(&DataKey::Group, &group);

        let members: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Members, &members);
        env.storage().instance().set(&DataKey::MemberCount, &0u32);

        // Admin auto-joins (internal call - no auth required)
        Self::add_admin_to_group(&env, admin.clone())?;

        env.events().publish(
            (symbol_short!("created"),),
            (group_id, contribution_amount, total_members),
        );

        Ok(group)
    }

    /// Join a savings group
    pub fn join_group(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();

        let mut group: SavingsGroup = env
            .storage()
            .instance()
            .get(&DataKey::Group)
            .ok_or(Error::GroupNotFound)?;

        if group.status != GroupStatus::Open {
            return Err(Error::GroupNotAcceptingMembers);
        }

        let member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
            .unwrap_or(0);

        if member_count >= group.total_members {
            return Err(Error::GroupIsFull);
        }

        // Check if already a member
        if env
            .storage()
            .instance()
            .has(&DataKey::MemberData(member.clone()))
        {
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

        env.storage()
            .instance()
            .set(&DataKey::MemberData(member.clone()), &new_member);

        let mut members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));
        members.push_back(member.clone());
        env.storage().instance().set(&DataKey::Members, &members);

        let new_count = member_count + 1;
        env.storage()
            .instance()
            .set(&DataKey::MemberCount, &new_count);

        // If group is full, change status to Active
        if new_count == group.total_members {
            group.status = GroupStatus::Active;
            group.current_round = 1;
            env.storage().instance().set(&DataKey::Group, &group);

            // Set first round deadline
            let deadline = Self::calculate_deadline(&env, &group, 1);
            env.storage()
                .instance()
                .set(&DataKey::RoundDeadline(1), &deadline);
        }

        env.events()
            .publish((symbol_short!("joined"),), (member, new_count));

        Ok(())
    }

    /// Make a contribution for the current round
    pub fn contribute(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();

        let group: SavingsGroup = env
            .storage()
            .instance()
            .get(&DataKey::Group)
            .ok_or(Error::GroupNotFound)?;

        if group.status != GroupStatus::Active {
            return Err(Error::GroupNotActive);
        }

        let mut member_data: Member = env
            .storage()
            .instance()
            .get(&DataKey::MemberData(member.clone()))
            .ok_or(Error::NotMember)?;

        if member_data.status == MemberStatus::Defaulted {
            return Err(Error::MemberDefaulted);
        }

        if member_data.status == MemberStatus::PaidCurrentRound {
            return Err(Error::AlreadyPaidThisRound);
        }

        let current_round = group.current_round;
        let deadline: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RoundDeadline(current_round))
            .unwrap_or(0);

        if env.ledger().timestamp() > deadline + 259200 {
            // 3 days grace period
            member_data.status = MemberStatus::Defaulted;
            env.storage()
                .instance()
                .set(&DataKey::MemberData(member.clone()), &member_data);
            return Err(Error::PaymentWindowClosed);
        }

        // Record contribution
        let contribution = Contribution {
            member: member.clone(),
            amount: group.contribution_amount,
            round: current_round,
            timestamp: env.ledger().timestamp(),
        };

        let mut round_contributions: Vec<Contribution> = env
            .storage()
            .instance()
            .get(&DataKey::Contributions(current_round))
            .unwrap_or(Vec::new(&env));
        round_contributions.push_back(contribution);
        env.storage()
            .instance()
            .set(&DataKey::Contributions(current_round), &round_contributions);

        member_data.status = MemberStatus::PaidCurrentRound;
        member_data.total_contributed += group.contribution_amount;
        env.storage()
            .instance()
            .set(&DataKey::MemberData(member.clone()), &member_data);

        env.events().publish(
            (symbol_short!("contrib"),),
            (member, group.contribution_amount, current_round),
        );

        // Check if all members have paid
        if Self::all_members_paid(&env, current_round) {
            Self::distribute_payout(env)?;
        }

        Ok(())
    }

    /// Distribute payout for current round
    fn distribute_payout(env: Env) -> Result<(), Error> {
        let group: SavingsGroup = env
            .storage()
            .instance()
            .get(&DataKey::Group)
            .ok_or(Error::GroupNotFound)?;

        let current_round = group.current_round;

        // Calculate payout amount
        let total_pool = group.contribution_amount * (group.total_members as i128);
        let platform_fee = (total_pool * (group.platform_fee_percent as i128)) / 10000;
        let payout_amount = total_pool - platform_fee;

        // Determine recipient (sequential by join_order)
        let recipient = Self::get_next_payout_recipient(&env, current_round)?;

        let payout = Payout {
            recipient: recipient.clone(),
            amount: payout_amount,
            round: current_round,
            timestamp: env.ledger().timestamp(),
        };

        let mut payouts: Vec<Payout> = env
            .storage()
            .instance()
            .get(&DataKey::Payouts(current_round))
            .unwrap_or(Vec::new(&env));
        payouts.push_back(payout);
        env.storage()
            .instance()
            .set(&DataKey::Payouts(current_round), &payouts);

        // Update recipient status
        let mut recipient_data: Member = env
            .storage()
            .instance()
            .get(&DataKey::MemberData(recipient.clone()))
            .ok_or(Error::RecipientNotFound)?;
        recipient_data.has_received_payout = true;
        recipient_data.payout_round = current_round;
        recipient_data.status = MemberStatus::ReceivedPayout;
        env.storage()
            .instance()
            .set(&DataKey::MemberData(recipient.clone()), &recipient_data);

        env.events().publish(
            (symbol_short!("payout"),),
            (recipient, payout_amount, current_round),
        );

        // End round
        Self::end_round(env, group)?;

        Ok(())
    }

    /// End current round and start next
    fn end_round(env: Env, mut group: SavingsGroup) -> Result<(), Error> {
        // Reset all member statuses
        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));

        for member_addr in members.iter() {
            let mut member_data: Member = env
                .storage()
                .instance()
                .get(&DataKey::MemberData(member_addr.clone()))
                .unwrap();

            if member_data.status == MemberStatus::PaidCurrentRound {
                member_data.status = MemberStatus::Active;
            }
            // Keep Defaulted and ReceivedPayout as is

            env.storage()
                .instance()
                .set(&DataKey::MemberData(member_addr), &member_data);
        }

        // Move to next round or complete
        if group.current_round >= group.total_members {
            group.status = GroupStatus::Completed;
        } else {
            group.current_round += 1;
            let deadline = Self::calculate_deadline(&env, &group, group.current_round);
            env.storage()
                .instance()
                .set(&DataKey::RoundDeadline(group.current_round), &deadline);
        }

        env.storage().instance().set(&DataKey::Group, &group);

        env.events()
            .publish((symbol_short!("round_end"),), group.current_round - 1);

        Ok(())
    }

    // Helper functions
    fn add_admin_to_group(env: &Env, member: Address) -> Result<(), Error> {
        // Internal helper - no auth required since called from create_group
        let member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MemberCount)
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

        env.storage()
            .instance()
            .set(&DataKey::MemberData(member.clone()), &new_member);

        let mut members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));
        members.push_back(member.clone());
        env.storage().instance().set(&DataKey::Members, &members);

        let new_count = member_count + 1;
        env.storage()
            .instance()
            .set(&DataKey::MemberCount, &new_count);

        env.events()
            .publish((symbol_short!("joined"),), (member, new_count));

        Ok(())
    }

    fn calculate_deadline(_env: &Env, group: &SavingsGroup, round: u32) -> u64 {
        let round_duration = match group.frequency {
            Frequency::Weekly => 604800,    // 7 days in seconds
            Frequency::BiWeekly => 1209600, // 14 days
            Frequency::Monthly => 2592000,  // 30 days
        };

        group.start_timestamp + (round as u64 * round_duration)
    }

    fn all_members_paid(env: &Env, round: u32) -> bool {
        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));

        let contributions: Vec<Contribution> = env
            .storage()
            .instance()
            .get(&DataKey::Contributions(round))
            .unwrap_or(Vec::new(&env));

        contributions.len() == members.len()
    }

    fn get_next_payout_recipient(env: &Env, round: u32) -> Result<Address, Error> {
        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));

        // Find member with join_order matching current round (0-indexed)
        for member_addr in members.iter() {
            let member_data: Member = env
                .storage()
                .instance()
                .get(&DataKey::MemberData(member_addr.clone()))
                .unwrap();

            if member_data.join_order == round - 1 && !member_data.has_received_payout {
                return Ok(member_addr);
            }
        }

        Err(Error::NoRecipientFound)
    }

    // View functions
    pub fn get_group(env: Env) -> Result<SavingsGroup, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Group)
            .ok_or(Error::GroupNotFound)
    }

    pub fn get_member(env: Env, member: Address) -> Result<Member, Error> {
        env.storage()
            .instance()
            .get(&DataKey::MemberData(member))
            .ok_or(Error::NotMember)
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_contributions(env: Env, round: u32) -> Vec<Contribution> {
        env.storage()
            .instance()
            .get(&DataKey::Contributions(round))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_payouts(env: Env, round: u32) -> Vec<Payout> {
        env.storage()
            .instance()
            .get(&DataKey::Payouts(round))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round_deadline(env: Env, round: u32) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RoundDeadline(round))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests;
