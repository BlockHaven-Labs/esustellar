#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

#[cfg(test)]
mod tests;

// #696: Error codes start at 900 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 900,
    NotPublisher = 901,
    StalePrice = 902,
    InvalidAsset = 903,
    AlreadyInitialized = 904,
}

#[contracttype]
#[derive(Clone)]
pub struct PriceData {
    pub price: i128,
    pub decimals: u32,
    pub timestamp: u64,
    pub publisher: Address,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    IsPublisher(Address),           // address -> bool
    LatestPrice(String),            // asset -> PriceData
    Initialized,
}

/// OracleFeed is an admin-managed publisher allowlist oracle.
/// Admin adds/removes publishers via add_publisher/remove_publisher.
/// Publishers push signed price data. Consumers read latest_price.
/// NOT integration-tested with real oracles (TODO).
/// Partially implemented — existing integration test framework can be extended.
#[contract]
pub struct OracleFeed;

#[contractimpl]
impl OracleFeed {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Add a publisher to the allowlist. Admin only.
    pub fn add_publisher(
        env: Env,
        admin: Address,
        publisher: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage().persistent().get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let key = DataKey::IsPublisher(publisher.clone());
        env.storage().persistent().set(&key, &true);
        env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        env.events().publish(
            (symbol_short!("add_pub"), admin),
            (publisher,),
        );

        Ok(())
    }

    /// Remove a publisher from the allowlist. Admin only.
    pub fn remove_publisher(
        env: Env,
        admin: Address,
        publisher: Address,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage().persistent().get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let key = DataKey::IsPublisher(publisher.clone());
        env.storage().persistent().remove(&key);

        env.events().publish(
            (symbol_short!("rm_pub"), admin),
            (publisher,),
        );

        Ok(())
    }

    /// Publish a price update for an asset. Only allowlisted publishers.
    pub fn publish_price(
        env: Env,
        publisher: Address,
        asset: String,
        price: i128,
        decimals: u32,
    ) -> Result<(), Error> {
        publisher.require_auth();

        let pub_key = DataKey::IsPublisher(publisher.clone());
        if !env.storage().persistent().has(&pub_key) {
            return Err(Error::NotPublisher);
        }

        let data = PriceData {
            price,
            decimals,
            timestamp: env.ledger().timestamp(),
            publisher: publisher.clone(),
        };

        let price_key = DataKey::LatestPrice(asset.clone());
        env.storage().persistent().set(&price_key, &data);
        env.storage().persistent().extend_ttl(&price_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        env.events().publish(
            (symbol_short!("price"), asset),
            (price, decimals, publisher),
        );

        Ok(())
    }

    /// Get the latest price for an asset.
    pub fn latest_price(env: Env, asset: String) -> Result<PriceData, Error> {
        let price_key = DataKey::LatestPrice(asset);
        env.storage().persistent().get(&price_key).ok_or(Error::InvalidAsset)
    }
}
