#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";

// #696: Error codes start at 400 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    UnauthorizedCaller = 400,
    CallerNotApproved = 401,
    AlreadyInitialized = 402,
    NotAdmin = 403,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    ApprovedCaller(Address),
    ApprovedCallers,
    Initialized,
    Admin,
}

/// NotificationRelay is a stateless on-chain event bridge.
/// Other contracts call `emit_notification` to emit structured, indexer-friendly
/// events that off-chain notification services (push/email/SMS) can consume.
/// No persistent storage beyond transient event data.
#[contract]
pub struct NotificationRelay;

#[contractimpl]
impl NotificationRelay {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Add an approved caller (contract address) that can emit notifications.
    /// Restricted to admin.
    pub fn add_approved_caller(
        env: Env,
        admin: Address,
        caller: Address,
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

        env.storage().persistent().set(&DataKey::ApprovedCaller(caller.clone()), &true);

        let mut callers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::ApprovedCallers)
            .unwrap_or(Vec::new(&env));
        callers.push_back(caller.clone());
        env.storage().persistent().set(&DataKey::ApprovedCallers, &callers);

        Ok(())
    }

    /// Remove an approved caller. Restricted to admin.
    pub fn remove_approved_caller(
        env: Env,
        admin: Address,
        caller: Address,
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

        env.storage().persistent().remove(&DataKey::ApprovedCaller(caller.clone()));

        let callers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::ApprovedCallers)
            .unwrap_or(Vec::new(&env));
        let mut new_callers: Vec<Address> = Vec::new(&env);
        for c in callers.iter() {
            if c != caller {
                new_callers.push_back(c);
            }
        }
        env.storage().persistent().set(&DataKey::ApprovedCallers, &new_callers);

        Ok(())
    }

    /// Emit a structured notification event.
    /// Restricted to approved callers only (same pattern as AuditLog).
    ///
    /// # Event Schema
    /// - Topics: (notification_type, recipient)
    /// - Data: (source_contract, metadata_hash)
    ///
    /// The `notification_type` identifies the kind of notification:
    /// - "due" = contribution is due
    /// - "paid" = payout received
    /// - "alert" = general alert
    /// - "remind" = reminder
    pub fn emit_notification(
        env: Env,
        source_contract: Address,
        recipient: Address,
        notification_type: String,
        metadata_hash: String,
    ) -> Result<(), Error> {
        // Verify caller is approved
        let is_approved: bool = env
            .storage()
            .persistent()
            .get(&DataKey::ApprovedCaller(source_contract.clone()))
            .unwrap_or(false);

        if !is_approved {
            return Err(Error::CallerNotApproved);
        }

        // Emit structured event for indexer consumption
        env.events().publish(
            (notification_type.clone(), recipient.clone()),
            (source_contract, metadata_hash),
        );

        Ok(())
    }

    /// Get all approved callers (view function)
    pub fn get_approved_callers(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::ApprovedCallers)
            .unwrap_or(Vec::new(&env))
    }

    /// Check if a caller is approved
    pub fn is_approved(env: Env, caller: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::ApprovedCaller(caller))
            .unwrap_or(false)
    }
}
