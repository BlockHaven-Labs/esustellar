#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

pub const CONTRACT_VERSION: &str = "0.1.0";
pub const MAX_STRING_LEN: u32 = 64;
pub const PAGE_SIZE: u32 = 100;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GroupAlreadyRegistered = 100,
    GroupNotFound = 101,
    NotGroupAdmin = 102,
    UserNotInGroup = 103,
    InvalidAddress = 104,
    InvalidGroupId = 105,
    StringTooLong = 106,
}

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

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    AllGroups,
    UserGroups(Address),
    GroupInfo(Address),
    GroupCount,
    RegisteredGroupId(String),
}

/// Normalizes a group ID string by trimming leading/trailing ASCII whitespace,
/// folding ASCII characters to lowercase, and enforcing length constraints.
pub fn normalize_group_id(env: &Env, raw_id: &String) -> Result<String, Error> {
    let len = raw_id.len();
    if len == 0 {
        return Err(Error::InvalidGroupId);
    }
    if len > MAX_STRING_LEN {
        return Err(Error::StringTooLong);
    }

    let mut buf = [0u8; 64];
    let slice = &mut buf[..len as usize];
    raw_id.copy_into_slice(slice);

    let mut start = 0;
    while start < slice.len() && slice[start].is_ascii_whitespace() {
        start += 1;
    }

    let mut end = slice.len();
    while end > start && slice[end - 1].is_ascii_whitespace() {
        end -= 1;
    }

    let trimmed = &mut slice[start..end];
    if trimmed.is_empty() {
        return Err(Error::InvalidGroupId);
    }

    for b in trimmed.iter_mut() {
        *b = b.to_ascii_lowercase();
    }

    let normalized_str = core::str::from_utf8(trimmed).map_err(|_| Error::InvalidGroupId)?;
    Ok(String::from_str(env, normalized_str))
}

#[contract]
pub struct GroupRegistry;

#[contractimpl]
impl GroupRegistry {
    /// Register a savings group in the registry.
    /// Normalizes group_id and ensures no duplicate registrations can occur.
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

        let group_id = normalize_group_id(&env, &group_id)?;

        if env
            .storage()
            .persistent()
            .has(&DataKey::GroupInfo(contract_address.clone()))
            || env
                .storage()
                .persistent()
                .has(&DataKey::RegisteredGroupId(group_id.clone()))
        {
            return Err(Error::GroupAlreadyRegistered);
        }

        let savings_group = esustellar_savings::SavingsContractClient::new(&env, &contract_address)
            .try_get_group(&group_id)
            .map_err(|_| Error::InvalidAddress)?
            .map_err(|_| Error::InvalidAddress)?;
        if savings_group.admin != admin {
            return Err(Error::NotGroupAdmin);
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

        env.storage()
            .persistent()
            .set(&DataKey::GroupInfo(contract_address.clone()), &group_info);
        env.storage()
            .persistent()
            .set(&DataKey::RegisteredGroupId(group_id.clone()), &contract_address);
        env.storage().persistent().extend_ttl(
            &DataKey::GroupInfo(contract_address.clone()),
            6_312_000,
            6_312_000,
        );

        let mut all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        all_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::AllGroups, &all_groups);

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::GroupCount)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::GroupCount, &(count + 1));

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

    pub fn add_member(
        env: Env,
        contract_address: Address,
        member: Address,
    ) -> Result<bool, Error> {
        member.require_auth();

        let _group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        let mut user_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(member.clone()))
            .unwrap_or(Vec::new(&env));

        for i in 0..user_groups.len() {
            if let Some(addr) = user_groups.get(i) {
                if addr == contract_address {
                    return Ok(false);
                }
            }
        }

        user_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(member.clone()), &user_groups);

        env.events()
            .publish((symbol_short!("add_mem"),), (contract_address, member));

        Ok(true)
    }

    pub fn remove_member(
        env: Env,
        contract_address: Address,
        member: Address,
    ) -> Result<(), Error> {
        member.require_auth();

        let _group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        let mut user_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(member.clone()))
            .unwrap_or(Vec::new(&env));

        let mut index_to_remove: Option<u32> = None;
        for i in 0..user_groups.len() {
            if let Some(addr) = user_groups.get(i) {
                if addr == contract_address {
                    index_to_remove = Some(i);
                    break;
                }
            }
        }

        if let Some(i) = index_to_remove {
            user_groups.remove(i);
            env.storage()
                .persistent()
                .set(&DataKey::UserGroups(member.clone()), &user_groups);

            env.events()
                .publish((symbol_short!("rm_mem"),), (contract_address, member));
        }

        Ok(())
    }

    pub fn update_group_info(
        env: Env,
        contract_address: Address,
        admin: Address,
        name: String,
        is_public: bool,
        total_members: u32,
    ) -> Result<(), Error> {
        admin.require_auth();

        let mut group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group_info.admin != admin {
            return Err(Error::NotGroupAdmin);
        }

        group_info.name = name;
        group_info.is_public = is_public;
        group_info.total_members = total_members;

        env.storage()
            .persistent()
            .set(&DataKey::GroupInfo(contract_address.clone()), &group_info);

        env.events()
            .publish((symbol_short!("upd_info"),), (contract_address, admin));

        Ok(())
    }

    pub fn transfer_admin(
        env: Env,
        contract_address: Address,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        current_admin.require_auth();

        let mut group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group_info.admin != current_admin {
            return Err(Error::NotGroupAdmin);
        }

        group_info.admin = new_admin.clone();
        env.storage()
            .persistent()
            .set(&DataKey::GroupInfo(contract_address.clone()), &group_info);

        let mut new_admin_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(new_admin.clone()))
            .unwrap_or(Vec::new(&env));
        new_admin_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(new_admin.clone()), &new_admin_groups);

        env.events().publish(
            (symbol_short!("adm_xfer"),),
            (contract_address, current_admin, new_admin),
        );

        Ok(())
    }

    pub fn unregister_group(env: Env, contract_address: Address, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        let group_info: GroupInfo = env
            .storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address.clone()))
            .ok_or(Error::GroupNotFound)?;

        if group_info.admin != admin {
            return Err(Error::NotGroupAdmin);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::GroupInfo(contract_address.clone()));
        env.storage()
            .persistent()
            .remove(&DataKey::RegisteredGroupId(group_info.group_id.clone()));

        let mut all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let mut new_all_groups: Vec<Address> = Vec::new(&env);
        for i in 0..all_groups.len() {
            if let Some(addr) = all_groups.get(i) {
                if addr != contract_address {
                    new_all_groups.push_back(addr);
                }
            }
        }
        env.storage()
            .persistent()
            .set(&DataKey::AllGroups, &new_all_groups);

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::GroupCount)
            .unwrap_or(0);
        if count > 0 {
            env.storage()
                .persistent()
                .set(&DataKey::GroupCount, &(count - 1));
        }

        env.events()
            .publish((symbol_short!("unreg_grp"),), (contract_address, admin));

        Ok(())
    }

    pub fn get_group_info(env: Env, contract_address: Address) -> Result<GroupInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::GroupInfo(contract_address))
            .ok_or(Error::GroupNotFound)
    }

    pub fn get_group_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::GroupCount)
            .unwrap_or(0)
    }

    pub fn get_user_groups(env: Env, user: Address) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_user_groups_page(env: Env, user: Address, page: u32, page_size: u32) -> Vec<Address> {
        let all: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env));
        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, all.len() as usize);
        let mut result: Vec<Address> = Vec::new(&env);
        if start < all.len() as usize {
            for i in start..end {
                if let Some(addr) = all.get(i as u32) {
                    result.push_back(addr);
                }
            }
        }
        result
    }

    pub fn get_user_groups_count(env: Env, user: Address) -> u32 {
        let all: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::UserGroups(user))
            .unwrap_or(Vec::new(&env));
        all.len()
    }

    pub fn get_all_groups(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_all_groups_page(env: Env, page: u32, page_size: u32) -> Vec<Address> {
        let all: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));
        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, all.len() as usize);
        let mut result: Vec<Address> = Vec::new(&env);
        if start < all.len() as usize {
            for i in start..end {
                if let Some(addr) = all.get(i as u32) {
                    result.push_back(addr);
                }
            }
        }
        result
    }

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

    pub fn get_public_groups_page(env: Env, page: u32, page_size: u32) -> Vec<GroupInfo> {
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

        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, public_groups.len() as usize);
        let mut result: Vec<GroupInfo> = Vec::new(&env);
        if start < public_groups.len() as usize {
            for i in start..end {
                if let Some(g) = public_groups.get(i as u32) {
                    result.push_back(g);
                }
            }
        }
        result
    }

    pub fn get_public_groups_page_filtered(
        env: Env,
        page: u32,
        page_size: u32,
        admin: Option<Address>,
        min_members: Option<u32>,
        max_members: Option<u32>,
    ) -> Vec<GroupInfo> {
        let all_groups: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::AllGroups)
            .unwrap_or(Vec::new(&env));

        let mut filtered: Vec<GroupInfo> = Vec::new(&env);

        for i in 0..all_groups.len() {
            if let Some(group_addr) = all_groups.get(i) {
                if let Some(group_info) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, GroupInfo>(&DataKey::GroupInfo(group_addr))
                {
                    if !group_info.is_public {
                        continue;
                    }
                    let mut matches = true;
                    if let Some(ref a) = admin {
                        if group_info.admin != *a {
                            matches = false;
                        }
                    }
                    if let Some(min) = min_members {
                        if group_info.total_members < min {
                            matches = false;
                        }
                    }
                    if let Some(max) = max_members {
                        if group_info.total_members > max {
                            matches = false;
                        }
                    }
                    if matches {
                        filtered.push_back(group_info);
                    }
                }
            }
        }

        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, filtered.len() as usize);
        let mut result: Vec<GroupInfo> = Vec::new(&env);
        if start < filtered.len() as usize {
            for i in start..end {
                if let Some(g) = filtered.get(i as u32) {
                    result.push_back(g);
                }
            }
        }
        result
    }
}

#[cfg(test)]
mod tests;
