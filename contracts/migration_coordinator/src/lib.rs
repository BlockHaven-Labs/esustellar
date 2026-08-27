#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

#[cfg(test)]
mod tests;

// #696: Error codes start at 800 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAdmin = 800,
    VersionNotFound = 801,
    AlreadyDeprecated = 802,
    NoVersionsRegistered = 803,
    AlreadyInitialized = 804,
}

#[contracttype]
#[derive(Clone)]
pub struct VersionInfo {
    pub address: Address,
    pub version: String,
    pub is_deprecated: bool,
    pub registered_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    CurrentVersion(String),          // contract_name -> Address
    VersionInfo(String, String),     // (contract_name, version) -> VersionInfo
    AllVersions(String),             // contract_name -> Vec<String>
    Initialized,
    Admin,
}

/// MigrationCoordinator is a version registry/pointer contract.
/// It does NOT attempt actual state migration (out of scope).
/// It tracks which contract addresses are "current" per version and
/// signals deprecation to frontends/indexers.
#[contract]
pub struct MigrationCoordinator;

#[contractimpl]
impl MigrationCoordinator {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Register a new version of a contract.
    /// Automatically sets this version as the current one.
    pub fn register_version(
        env: Env,
        admin: Address,
        contract_name: String,
        version: String,
        address: Address,
    ) -> Result<VersionInfo, Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage().persistent().get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let now = env.ledger().timestamp();

        let info = VersionInfo {
            address: address.clone(),
            version: version.clone(),
            is_deprecated: false,
            registered_at: now,
        };

        // Store version info
        let info_key = DataKey::VersionInfo(contract_name.clone(), version.clone());
        env.storage().persistent().set(&info_key, &info);
        env.storage().persistent().extend_ttl(&info_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // Update current version pointer
        let current_key = DataKey::CurrentVersion(contract_name.clone());
        env.storage().persistent().set(&current_key, &address);
        env.storage().persistent().extend_ttl(&current_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // Track all versions
        let versions_key = DataKey::AllVersions(contract_name.clone());
        let mut versions: Vec<String> = env
            .storage().persistent().get(&versions_key)
            .unwrap_or(Vec::new(&env));
        versions.push_back(version.clone());
        env.storage().persistent().set(&versions_key, &versions);

        env.events().publish(
            (symbol_short!("register"), contract_name),
            (version, address),
        );

        Ok(info)
    }

    /// Deprecate a specific version. It remains queryable but flagged.
    pub fn deprecate_version(
        env: Env,
        admin: Address,
        contract_name: String,
        version: String,
    ) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage().persistent().get(&DataKey::Admin)
            .ok_or(Error::NotAdmin)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        let info_key = DataKey::VersionInfo(contract_name.clone(), version.clone());
        let mut info: VersionInfo = env
            .storage().persistent().get(&info_key)
            .ok_or(Error::VersionNotFound)?;

        if info.is_deprecated {
            return Err(Error::AlreadyDeprecated);
        }

        info.is_deprecated = true;
        env.storage().persistent().set(&info_key, &info);

        env.events().publish(
            (symbol_short!("deprecate"), contract_name),
            (version,),
        );

        Ok(())
    }

    /// Get the current (latest non-deprecated) contract address.
    /// This is the single source of truth frontends should query.
    pub fn get_current(env: Env, contract_name: String) -> Result<Address, Error> {
        let current_key = DataKey::CurrentVersion(contract_name);
        env.storage().persistent().get(&current_key).ok_or(Error::NoVersionsRegistered)
    }

    /// Get version info for a specific contract version.
    pub fn get_version_info(
        env: Env,
        contract_name: String,
        version: String,
    ) -> Result<VersionInfo, Error> {
        let info_key = DataKey::VersionInfo(contract_name, version);
        env.storage().persistent().get(&info_key).ok_or(Error::VersionNotFound)
    }

    /// Get all registered versions for a contract
    pub fn get_all_versions(env: Env, contract_name: String) -> Vec<String> {
        let versions_key = DataKey::AllVersions(contract_name);
        env.storage().persistent().get(&versions_key).unwrap_or(Vec::new(&env))
    }
}
