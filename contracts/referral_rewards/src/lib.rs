#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
    Vec,
};

// #696: Error codes start at 200 to avoid overlap with registry (100-199)
// and savings (1-99) contract codes.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyRegistered = 200,
    ReferralNotFound = 201,
    AlreadyClaimed = 202,
    ReputationThresholdNotMet = 203,
    Unauthorized = 204,
    InvalidAddress = 205,
    EmptyGroupId = 206,
    ConfigNotSet = 207,
}

// #697: Contract version for schema migration tracking.
pub const CONTRACT_VERSION: &str = "0.1.0";

/// Tracks the status of a single referral (referrer → referee in a group).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ReferralStatus {
    Pending,
    Claimed,
}

/// A referral record linking a referrer to a referee within a specific group.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Referral {
    pub referrer: Address,
    pub referee: Address,
    pub group_id: String,
    pub registered_at: u64,
    pub status: ReferralStatus,
}

/// Reward configuration — who pays, how much, and the reputation threshold.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardConfig {
    pub admin: Address,
    /// FeeTreasury contract that pre-funds this contract for reward payouts.
    pub treasury: Address,
    /// SEP-41 token used for reward payouts.
    pub asset: Address,
    /// Reward amount per successful referral.
    pub amount: i128,
    /// Minimum reputation score (number of successful contributions) the
    /// referee must reach before the referrer can claim the reward.
    pub reputation_threshold: u32,
    /// Address of the ReputationRegistry contract for cross-contract reads.
    pub reputation_registry: Address,
}

/// Trait defining the ReputationRegistry cross-contract interface.
/// Used to read a member's reputation score (number of successful contributions).
#[contracttype]
pub trait ReputationRegistryInterface {
    fn get_reputation(env: Env, member: Address) -> u32;
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    RewardConfig,
    Referral(Address, Address, String), // (referrer, referee, group_id)
    ReferrerReferrals(Address),          // Vec of (referee, group_id) pairs
    Admin,
    Initialized,
}

/// ReferralRewards contract — incentivizes member acquisition by rewarding
/// referrers once their referred members (referees) prove reliability
/// through a reputation threshold met in the ReputationRegistry.
///
/// # Funding Model
/// Rewards are paid from a pre-funded FeeTreasury, NOT minted from thin
/// air. The admin must configure the treasury, and the treasury must hold
/// sufficient tokens before any member can claim rewards.
///
/// # Double-Claim Protection
/// Each (referrer, referee, group_id) tuple can only be claimed once.
/// The referral status transitions from Pending → Claimed atomically.
#[contract]
pub struct ReferralRewards;

#[contractimpl]
impl ReferralRewards {
    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::Unauthorized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);

        let version = String::from_str(&env, CONTRACT_VERSION);
        env.events()
            .publish((symbol_short!("version"),), (version,));

        Ok(())
    }

    /// Admin-only: configure the reward parameters.
    ///
    /// # Arguments
    /// - `admin` — must be the contract admin and must authorize.
    /// - `treasury` — address of the FeeTreasury contract holding reward funds.
    /// - `asset` — SEP-41 token address used for reward payouts.
    /// - `amount` — reward amount per successful referral.
    /// - `reputation_threshold` — minimum reputation score the referee must
    ///   reach before the reward becomes claimable.
    /// - `reputation_registry` — address of the ReputationRegistry contract
    ///   used for cross-contract reputation reads.
    pub fn set_reward_config(
        env: Env,
        admin: Address,
        treasury: Address,
        asset: Address,
        amount: i128,
        reputation_threshold: u32,
        reputation_registry: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        let config = RewardConfig {
            admin: admin.clone(),
            treasury,
            asset,
            amount,
            reputation_threshold,
            reputation_registry,
        };

        env.storage()
            .persistent()
            .set(&DataKey::RewardConfig, &config);

        env.events().publish(
            (symbol_short!("cfg_set"),),
            (admin, amount, reputation_threshold),
        );

        Ok(())
    }

    /// Register a referral: the referrer vouches for a referee joining a group.
    ///
    /// # Preconditions
    /// - `referrer` must authorize the transaction.
    /// - `group_id` must be non-empty.
    /// - This specific (referrer, referee, group_id) tuple must not already exist.
    ///
    /// # Behavior
    /// - Creates a Pending referral record.
    /// - Indexes the referral under the referrer's address.
    /// - Emits a `registered` event.
    /// - Returns the referral record.
    pub fn register_referral(
        env: Env,
        referrer: Address,
        referee: Address,
        group_id: String,
    ) -> Result<Referral, Error> {
        referrer.require_auth();

        if group_id.len() == 0 {
            return Err(Error::EmptyGroupId);
        }

        // Check for existing referral (double-register protection).
        if env
            .storage()
            .persistent()
            .has(&DataKey::Referral(
                referrer.clone(),
                referee.clone(),
                group_id.clone(),
            ))
        {
            return Err(Error::AlreadyRegistered);
        }

        let referral = Referral {
            referrer: referrer.clone(),
            referee: referee.clone(),
            group_id: group_id.clone(),
            registered_at: env.ledger().timestamp(),
            status: ReferralStatus::Pending,
        };

        env.storage().persistent().set(
            &DataKey::Referral(
                referrer.clone(),
                referee.clone(),
                group_id.clone(),
            ),
            &referral,
        );

        // Index: append to the referrer's referral list.
        let mut referrer_referrals: Vec<(Address, String)> = env
            .storage()
            .persistent()
            .get(&DataKey::ReferrerReferrals(referrer.clone()))
            .unwrap_or(Vec::new(&env));
        referrer_referrals
            .push_back((referee.clone(), group_id.clone()));
        env.storage().persistent().set(
            &DataKey::ReferrerReferrals(referrer.clone()),
            &referrer_referrals,
        );

        env.events().publish(
            (symbol_short!("ref_reg"),),
            (referrer, referee, group_id),
        );

        Ok(referral)
    }

    /// Claim the reward for a specific referral.
    ///
    /// # Preconditions
    /// - `referrer` must authorize the transaction.
    /// - A Pending referral for (referrer, referee, group_id) must exist.
    /// - Reward config must be set.
    ///
    /// # Cross-Contract Reputation Check
    /// The referee's reputation score is read from the configured
    /// ReputationRegistry contract via `env.invoke_contract()`. If the
    /// score is below the configured `reputation_threshold`, the claim
    /// is rejected with `ReputationThresholdNotMet`.
    ///
    /// # Behavior
    /// - Reads the referee's reputation via a cross-contract call.
    /// - If the threshold is met, transfers `amount` of `asset` from the
    ///   contract's custody to the referrer.
    /// - Marks the referral as Claimed (double-claim protection).
    /// - Emits a `reward_paid` event.
    pub fn claim_reward(
        env: Env,
        referrer: Address,
        referee: Address,
        group_id: String,
    ) -> Result<i128, Error> {
        referrer.require_auth();

        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&DataKey::Referral(
                referrer.clone(),
                referee.clone(),
                group_id.clone(),
            ))
            .ok_or(Error::ReferralNotFound)?;

        if referral.status == ReferralStatus::Claimed {
            return Err(Error::AlreadyClaimed);
        }

        let config: RewardConfig = env
            .storage()
            .persistent()
            .get(&DataKey::RewardConfig)
            .ok_or(Error::ConfigNotSet)?;

        // Cross-contract read: query the referee's reputation score from the
        // ReputationRegistry. The registry must implement a `get_reputation`
        // function that returns a u32 representing the number of successful
        // contributions by the given member.
        let reputation_score: u32 = env.invoke_contract(
            &config.reputation_registry,
            &symbol_short!("get_rep"),
            Vec::from_array(&env, [referee.into_val(&env)]),
        );

        if reputation_score < config.reputation_threshold {
            return Err(Error::ReputationThresholdNotMet);
        }

        // Transfer reward from the contract's custody to the referrer.
        // The contract must be pre-funded by the treasury via a SEP-41 transfer.
        token::Client::new(&env, &config.asset).transfer(
            &env.current_contract_address(),
            &referrer,
            &config.amount,
        );

        // Mark as claimed (double-claim protection).
        referral.status = ReferralStatus::Claimed;
        env.storage().persistent().set(
            &DataKey::Referral(
                referrer.clone(),
                referee.clone(),
                group_id.clone(),
            ),
            &referral,
        );

        env.events().publish(
            (symbol_short!("reward_pd"),),
            (referrer, referee, config.amount, config.asset),
        );

        Ok(config.amount)
    }

    /// Get a specific referral record.
    pub fn get_referral(
        env: Env,
        referrer: Address,
        referee: Address,
        group_id: String,
    ) -> Result<Referral, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Referral(referrer, referee, group_id))
            .ok_or(Error::ReferralNotFound)
    }

    /// Get all referrals made by a specific referrer.
    pub fn get_referrer_referrals(
        env: Env,
        referrer: Address,
    ) -> Vec<(Address, String)> {
        env.storage()
            .persistent()
            .get(&DataKey::ReferrerReferrals(referrer))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the current reward configuration.
    pub fn get_reward_config(env: Env) -> Result<RewardConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::RewardConfig)
            .ok_or(Error::ConfigNotSet)
    }
}

#[cfg(test)]
mod tests;
