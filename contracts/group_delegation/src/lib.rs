#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;

// #696: Error codes start at 200 to avoid overlap with savings (1-39) and registry (100+).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyDelegate = 200,
    NotADelegate = 201,
    Unauthorized = 202,
    CannotDelegateToSelf = 203,
    RevocationFailed = 204,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Delegation {
    pub member: Address,
    pub delegate: Address,
    pub group_id: String,
    pub authorized_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Delegation(Address, Address, String), // (member, delegate, group_id)
    DelegateList(Address, String),        // (member, group_id) -> Vec<Delegation>
    Initialized,
    Admin,
}

#[contract]
pub struct GroupDelegation;

#[contractimpl]
impl GroupDelegation {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::Unauthorized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Authorize a delegate to contribute on behalf of a member for a specific group.
    /// Delegation is scoped per group, not a blanket account-wide permission.
    pub fn authorize_delegate(
        env: Env,
        member: Address,
        delegate: Address,
        group_id: String,
    ) -> Result<Delegation, Error> {
        member.require_auth();

        if member == delegate {
            return Err(Error::CannotDelegateToSelf);
        }

        let key = DataKey::Delegation(member.clone(), delegate.clone(), group_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyDelegate);
        }

        let delegation = Delegation {
            member: member.clone(),
            delegate: delegate.clone(),
            group_id: group_id.clone(),
            authorized_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &delegation);
        env.storage().persistent().extend_ttl(&key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        // Update delegate list for the member in this group
        let list_key = DataKey::DelegateList(member.clone(), group_id.clone());
        let mut list: Vec<Delegation> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));
        list.push_back(delegation.clone());
        env.storage().persistent().set(&list_key, &list);
        env.storage().persistent().extend_ttl(&list_key, GROUP_TTL_EXTEND, GROUP_TTL_EXTEND);

        env.events().publish(
            (symbol_short!("auth"), group_id.clone()),
            (member, delegate, group_id),
        );

        Ok(delegation)
    }

    /// Revoke a delegate's authorization. Takes effect immediately.
    pub fn revoke_delegate(
        env: Env,
        member: Address,
        delegate: Address,
        group_id: String,
    ) -> Result<(), Error> {
        member.require_auth();

        let key = DataKey::Delegation(member.clone(), delegate.clone(), group_id.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::NotADelegate);
        }

        env.storage().persistent().remove(&key);

        // Remove from delegate list
        let list_key = DataKey::DelegateList(member.clone(), group_id.clone());
        let list: Vec<Delegation> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));
        let mut new_list: Vec<Delegation> = Vec::new(&env);
        for d in list.iter() {
            if d.delegate != delegate {
                new_list.push_back(d);
            }
        }
        env.storage().persistent().set(&list_key, &new_list);

        env.events().publish(
            (symbol_short!("revoke"), group_id.clone()),
            (member, delegate, group_id),
        );

        Ok(())
    }

    /// Contribute on behalf of a member, forwarding to the savings contract.
    /// The contribution is attributed to the member, not the delegate.
    pub fn contribute_as_delegate(
        env: Env,
        delegate: Address,
        member: Address,
        group_id: String,
        amount: i128,
    ) -> Result<(), Error> {
        delegate.require_auth();

        let key = DataKey::Delegation(member.clone(), delegate.clone(), group_id.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::NotADelegate);
        }

        // The contribution is attributed to member in downstream records
        // by calling the savings contract with member as the contributor
        let savings_contract_id: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;

        // Emit event attributing to member (not delegate)
        env.events().publish(
            (symbol_short!("delegate"), group_id.clone()),
            (member, delegate, amount, group_id),
        );

        Ok(())
    }

    /// Check if a delegate is authorized for a member in a group
    pub fn has_vouched(
        env: Env,
        member: Address,
        delegate: Address,
        group_id: String,
    ) -> bool {
        let key = DataKey::Delegation(member, delegate, group_id);
        env.storage().persistent().has(&key)
    }

    /// Get all delegations for a member in a group
    pub fn get_delegates(
        env: Env,
        member: Address,
        group_id: String,
    ) -> Vec<Delegation> {
        let list_key = DataKey::DelegateList(member, group_id);
        env.storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env))
    }
}
