#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

#[cfg(test)]
mod tests;

// #696: Error codes start at 600 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 600,
    PenaltyPolicyNotSet = 601,
    InvalidGracePeriod = 602,
    InvalidPenaltyPercent = 603,
    ContributionNotLate = 604,
    AlreadyInitialized = 605,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PenaltyPolicy {
    pub grace_period: u64,       // seconds after deadline before penalty applies
    pub penalty_percent: u32,    // basis points (e.g., 500 = 5%)
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Policy(String),              // group_id -> PenaltyPolicy
    PenaltyPool(String),         // group_id -> i128
    Initialized,
    Admin,
}

/// LatePaymentPenalty contract handles grace periods and penalty logic
/// for members who contribute late but before a round is force-resolved.
///
/// Penalty funds route back into the group's own pool (not FeeTreasury)
/// to benefit remaining members.
#[contract]
pub struct LatePaymentPenalty;

#[contractimpl]
impl LatePaymentPenalty {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Set the penalty policy for a group.
    /// - grace_period: seconds after the round deadline before penalty kicks in
    /// - penalty_percent: basis points (e.g., 500 = 5% of contribution amount)
    pub fn set_penalty_policy(
        env: Env,
        admin: Address,
        group_id: String,
        grace_period: u64,
        penalty_percent: u32,
    ) -> Result<PenaltyPolicy, Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage().persistent().get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        // Validate: penalty_percent should be 0-5000 (0-50%)
        if penalty_percent > 5000 {
            return Err(Error::InvalidPenaltyPercent);
        }

        // Validate: grace_period should be reasonable (0-30 days)
        if grace_period > 30 * 86400 {
            return Err(Error::InvalidGracePeriod);
        }

        let policy = PenaltyPolicy {
            grace_period,
            penalty_percent,
        };

        let key = DataKey::Policy(group_id.clone());
        env.storage().persistent().set(&key, &policy);
        env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        env.events().publish(
            (symbol_short!("policy"), group_id),
            (grace_period, penalty_percent),
        );

        Ok(policy)
    }

    /// Apply penalty for a late contribution.
    /// Called by the savings contract during contribute when a member is late.
    /// Returns the net amount after penalty deduction.
    ///
    /// # Arguments
    /// - group_id: the group the contribution is for
    /// - member: the member making the late contribution
    /// - amount: the original contribution amount in stroops
    /// - deadline_timestamp: the round deadline in seconds
    pub fn apply_penalty(
        env: Env,
        group_id: String,
        member: Address,
        amount: i128,
        deadline_timestamp: u64,
    ) -> Result<i128, Error> {
        let policy_key = DataKey::Policy(group_id.clone());
        let policy: PenaltyPolicy = env
            .storage().persistent().get(&policy_key)
            .ok_or(Error::PenaltyPolicyNotSet)?;

        let now = env.ledger().timestamp();

        // Check if contribution is within grace period (no penalty)
        if now <= deadline_timestamp + policy.grace_period {
            // Not late past grace — no penalty
            return Ok(amount);
        }

        // Calculate penalty
        let penalty_amount = (amount as u128)
            .checked_mul(policy.penalty_percent as u128)
            .and_then(|v| v.checked_div(10_000))
            .and_then(|v| Some(v as i128))
            .ok_or(Error::ContributionNotLate)?;

        let net_amount = amount
            .checked_sub(penalty_amount)
            .ok_or(Error::ContributionNotLate)?;

        // Route penalty to group's penalty pool
        let pool_key = DataKey::PenaltyPool(group_id.clone());
        let current_pool: i128 = env.storage().persistent().get(&pool_key).unwrap_or(0);
        let new_pool = current_pool.checked_add(penalty_amount).unwrap_or(current_pool);
        env.storage().persistent().set(&pool_key, &new_pool);

        env.events().publish(
            (symbol_short!("penalty"), group_id),
            (member, amount, penalty_amount, net_amount),
        );

        Ok(net_amount)
    }

    /// Get the penalty pool balance for a group
    pub fn penalty_pool_balance(env: Env, group_id: String) -> i128 {
        let pool_key = DataKey::PenaltyPool(group_id);
        env.storage().persistent().get(&pool_key).unwrap_or(0)
    }

    /// Get the penalty policy for a group
    pub fn get_policy(env: Env, group_id: String) -> Result<PenaltyPolicy, Error> {
        let policy_key = DataKey::Policy(group_id);
        env.storage().persistent().get(&policy_key).ok_or(Error::PenaltyPolicyNotSet)
    }
}
