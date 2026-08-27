#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

#[cfg(test)]
mod tests;

// #696: Error codes start at 700 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyVouched = 700,
    NotVouched = 701,
    CannotVouchForSelf = 702,
    AlreadyInitialized = 703,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    VouchCount(Address),            // subject -> u32
    HasVouched(Address, Address),   // (voucher, subject) -> bool
    VoucherList(Address),           // subject -> Vec<Address>
    Initialized,
    Admin,
}

/// SocialVouching is a permissionless contract for community-based trust attestation.
/// Any address can vouch for any other address, once per pair.
/// Vouch count is a public, cheap read for frontend display alongside ReputationScore.
#[contract]
pub struct SocialVouching;

#[contractimpl]
impl SocialVouching {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Vouch for another address. Permissionless — any address can vouch.
    /// One vouch per (voucher, subject) pair.
    pub fn vouch(
        env: Env,
        voucher: Address,
        subject: Address,
    ) -> Result<u32, Error> {
        voucher.require_auth();

        if voucher == subject {
            return Err(Error::CannotVouchForSelf);
        }

        let vouch_key = DataKey::HasVouched(voucher.clone(), subject.clone());
        if env.storage().persistent().has(&vouch_key) {
            return Err(Error::AlreadyVouched);
        }

        // Record the vouch
        env.storage().persistent().set(&vouch_key, &true);
        env.storage().persistent().extend_ttl(&vouch_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // Increment count
        let count_key = DataKey::VouchCount(subject.clone());
        let current: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_count = current + 1;
        env.storage().persistent().set(&count_key, &new_count);
        env.storage().persistent().extend_ttl(&count_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // Track voucher list for the subject
        let list_key = DataKey::VoucherList(subject.clone());
        let mut list: Vec<Address> = env.storage().persistent().get(&list_key).unwrap_or(Vec::new(&env));
        list.push_back(voucher.clone());
        env.storage().persistent().set(&list_key, &list);

        env.events().publish(
            (symbol_short!("vouch"), subject.clone()),
            (voucher, new_count),
        );

        Ok(new_count)
    }

    /// Revoke a vouch. Takes effect immediately.
    pub fn revoke_vouch(
        env: Env,
        voucher: Address,
        subject: Address,
    ) -> Result<u32, Error> {
        voucher.require_auth();

        let vouch_key = DataKey::HasVouched(voucher.clone(), subject.clone());
        if !env.storage().persistent().has(&vouch_key) {
            return Err(Error::NotVouched);
        }

        env.storage().persistent().remove(&vouch_key);

        // Decrement count
        let count_key = DataKey::VouchCount(subject.clone());
        let current: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_count = current.saturating_sub(1);
        env.storage().persistent().set(&count_key, &new_count);

        env.events().publish(
            (symbol_short!("revoke"), subject.clone()),
            (voucher, new_count),
        );

        Ok(new_count)
    }

    /// Get vouch count for a subject. Cheap read for frontend display.
    pub fn vouch_count(env: Env, subject: Address) -> u32 {
        let count_key = DataKey::VouchCount(subject);
        env.storage().persistent().get(&count_key).unwrap_or(0)
    }

    /// Check if a voucher has vouched for a subject
    pub fn has_vouched(env: Env, voucher: Address, subject: Address) -> bool {
        let vouch_key = DataKey::HasVouched(voucher, subject);
        env.storage().persistent().has(&vouch_key)
    }
}
