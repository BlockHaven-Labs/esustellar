#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GroupAlreadyRegistered = 1,
    GroupNotFound = 2,
    NotGroupAdmin = 3,
    UserNotInGroup = 4,
    InvalidAddress = 5,
}

// Data structures
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GroupInfo {
    pub contract_address: Address,
    pub group_id: String,
    pub name: String,
    pub admin: Address,
    pub is_public: bool,
    pub created_at: u64,
    pub total_members: u32,
}

// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    AllGroups,           // Vec<Address> - all registered group contract addresses
    UserGroups(Address), // Vec<Address> - groups a specific user belongs to
    GroupInfo(Address),  // GroupInfo - metadata for a specific group contract
    GroupCount,          // u32 - total number of registered groups
}

#[contract]
pub struct GroupRegistry;

#[contractimpl]
impl GroupRegistry {
    /// Register a new savings group contract
    /// Should be called by the group admin after deploying a savings contract
    pub fn register_group(
        env: Env,
        contract_address: Address,
        group_id: String,
        name: String,
        admin: Address,
        is_public: bool,
        total_members: u32,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Check if group already registered
        if env
            .storage()
            .persistent()
            .has(&DataKey::GroupInfo(contract_address.clone()))
        {
            return Err(Error::GroupAlreadyRegistered);
        }

        let group_info = GroupInfo {
            contract_address: contract_address.clone(),
            group_id: group_id.clone(),
            name,
            admin: admin.clone(),
            is_public,
            created_at: env.ledger().timestamp(),
            total_members,
        };

        // Store group info
        env.storage()
            .persistent()
            .set(&DataKey::GroupInfo(contract_address.clone()), &group_info);

        // Add to all groups list
        let mut all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::AllGroups, &all_groups);

        // Update group count
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::GroupCount)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::GroupCount, &(count + 1));

        // Add admin to their user groups
        let mut admin_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(admin.clone()))
            .unwrap_or(Vec::new(&env));
        admin_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(admin.clone()), &admin_groups);

        env.events().publish(
            (symbol_short!("reg_group"),),
            (contract_address, group_id, admin),
        );

        Ok(())
    }

    /// Add a member to a group's user mapping
    /// Should be called when a user joins a group
    pub fn add_member(env: Env, contract_address: Address, member: Address) -> Result<(), Error> {
        member.require_auth();

        // Verify group exists
        let _group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        // Get user's groups
        let mut user_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(member.clone()))
            .unwrap_or(Vec::new(&env));

        // Check if user is already in this group
        for i in 0..user_groups.len() {
            if let Some(addr) = user_groups.get(i) {
                if addr == contract_address {
                    // User already registered in this group, skip
                    return Ok(());
                }
            }
        }

        // Add group to user's list
        user_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(member.clone()), &user_groups);

        env.events()
            .publish((symbol_short!("add_mem"),), (contract_address, member));

        Ok(())
    }

    /// Get all groups a user is a member of
    pub fn get_user_groups(env: Env, user: Address) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env))
    }

    /// Get all public groups (for browsing/discovery)
    pub fn get_all_public_groups(env: Env) -> Vec<GroupInfo> {
        let all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let mut public_groups: Vec<GroupInfo> = Vec::new(&env);

        for i in 0..all_groups.len() {
            if let Some(group_addr) = all_groups.get(i) {
                if let Some(group_info) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, GroupInfo>(&DataKey::GroupInfo(group_addr))
                {
                    if group_info.is_public {
                        public_groups.push_back(group_info);
                    }
                }
            }
        }

        public_groups
    }

    /// Get metadata for a specific group
    pub fn get_group_info(env: Env, contract_address: Address) -> Result<GroupInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address))
            .ok_or(Error::GroupNotFound)
    }

    /// Get total number of registered groups
    pub fn get_group_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::GroupCount)
            .unwrap_or(0)
    }

    /// Get all registered groups (both public and private)
    /// Useful for admin/analytics purposes
    pub fn get_all_groups(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env))
    }

    /// Get detailed info for all registered groups
    pub fn get_all_groups_info(env: Env) -> Vec<GroupInfo> {
        let all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let mut groups_info: Vec<GroupInfo> = Vec::new(&env);

        for i in 0..all_groups.len() {
            if let Some(group_addr) = all_groups.get(i) {
                if let Some(group_info) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, GroupInfo>(&DataKey::GroupInfo(group_addr))
                {
                    groups_info.push_back(group_info);
                }
            }
        }

        groups_info
    }
}

#[cfg(test)]
mod tests;
