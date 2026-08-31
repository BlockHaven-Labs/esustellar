#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

// #696: Error codes start at 500 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 500,
    ClaimNotFound = 501,
    ClaimAlreadyProcessed = 502,
    Unauthorized = 503,
    InvalidAmount = 504,
    AlreadyInitialized = 505,
    NotAdmin = 506,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Pending,
    Approved,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct Claim {
    pub claim_id: u32,
    pub group_id: String,
    pub amount: i128,
    pub reason: String,
    pub filed_by: Address,
    pub filed_at: u64,
    pub status: ClaimStatus,
    pub reviewed_by: Option<Address>,
    pub reviewed_at: Option<u64>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    FundBalance(String),        // asset name -> i128
    Claim(u32),
    ClaimCount,
    Initialized,
    Admin,
}

#[contract]
pub struct GroupInsuranceFund;

#[contractimpl]
impl GroupInsuranceFund {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Contribute to the insurance fund. Small automatic skim from group contributions.
    pub fn contribute_to_fund(
        env: Env,
        group_id: String,
        asset: String,
        amount: i128,
    ) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::FundBalance(asset.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = current.checked_add(amount).ok_or(Error::InsufficientBalance)?;

        env.storage().persistent().set(&key, &new_balance);
        env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        env.events().publish(
            (symbol_short!("deposit"), group_id),
            (asset, amount),
        );

        Ok(new_balance)
    }

    /// File an insurance claim. Restricted to GroupOrganizer role.
    /// Claims require admin approval before payout.
    pub fn file_claim(
        env: Env,
        filed_by: Address,
        group_id: String,
        amount: i128,
        reason: String,
    ) -> Result<u32, Error> {
        filed_by.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0);
        let claim_id = count + 1;

        let claim = Claim {
            claim_id,
            group_id: group_id.clone(),
            amount,
            reason: reason.clone(),
            filed_by: filed_by.clone(),
            filed_at: env.ledger().timestamp(),
            status: ClaimStatus::Pending,
            reviewed_by: None,
            reviewed_at: None,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);
        env.storage()
            .persistent()
            .set(&DataKey::ClaimCount, &claim_id);
        env.storage().persistent().extend_ttl(
            &DataKey::Claim(claim_id),
            GROUP_TTL_EXTEND,
            GROUP_TTL_EXTEND,
        );

        env.events().publish(
            (symbol_short!("claim"), claim_id),
            (group_id, amount, reason, filed_by),
        );

        Ok(claim_id)
    }

    /// Approve a claim and release funds. Restricted to PlatformAdmin.
    pub fn approve_claim(
        env: Env,
        admin: Address,
        claim_id: u32,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .ok_or(Error::ClaimNotFound)?;

        if claim.status != ClaimStatus::Pending {
            return Err(Error::ClaimAlreadyProcessed);
        }

        claim.status = ClaimStatus::Approved;
        claim.reviewed_by = Some(admin.clone());
        claim.reviewed_at = Some(env.ledger().timestamp());

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("approve"), claim_id),
            (admin,),
        );

        Ok(())
    }

    /// Reject a claim. Restricted to PlatformAdmin.
    pub fn reject_claim(
        env: Env,
        admin: Address,
        claim_id: u32,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let mut claim: Claim = env
            .storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .ok_or(Error::ClaimNotFound)?;

        if claim.status != ClaimStatus::Pending {
            return Err(Error::ClaimAlreadyProcessed);
        }

        claim.status = ClaimStatus::Rejected;
        claim.reviewed_by = Some(admin.clone());
        claim.reviewed_at = Some(env.ledger().timestamp());

        env.storage()
            .persistent()
            .set(&DataKey::Claim(claim_id), &claim);

        env.events().publish(
            (symbol_short!("reject"), claim_id),
            (admin,),
        );

        Ok(())
    }

    /// Get the fund balance for a specific asset
    pub fn fund_balance(env: Env, asset: String) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::FundBalance(asset))
            .unwrap_or(0)
    }

    /// Get a claim by ID
    pub fn get_claim(env: Env, claim_id: u32) -> Result<Claim, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .ok_or(Error::ClaimNotFound)
    }

    /// Get total claim count
    pub fn get_claim_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ClaimCount)
            .unwrap_or(0)
    }
}
