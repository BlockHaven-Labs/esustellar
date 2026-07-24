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
}

const PAGE_SIZE: u32 = 100;

#[contract]
pub struct GroupRegistry;

#[contractimpl]
impl GroupRegistry {
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

        env.storage()
            .persistent()
            .set(&DataKey::GroupInfo(contract_address.clone()), &group_info);
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

    pub fn add_member(env: Env, contract_address: Address, member: Address) -> Result<(), Error> {
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
                    return Ok(());
                }
            }
        }

        user_groups.push_back(contract_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(member.clone()), &user_groups);

        env.events()
            .publish((symbol_short!("add_mem"),), (contract_address, member));

        Ok(())
    }

    pub fn remove_member(
        env: Env,
        contract_address: Address,
        member: Address,
    ) -> Result<(), Error> {
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

        let mut new_groups: Vec<Address> = Vec::new(&env);
        let mut found = false;
        for addr in user_groups.iter() {
            if addr == contract_address {
                found = true;
            } else {
                new_groups.push_back(addr);
            }
        }

        if !found {
            return Ok(());
        }

        env.storage()
            .persistent()
            .set(&DataKey::UserGroups(member.clone()), &new_groups);

        env.events()
            .publish((symbol_short!("rem_mem"),), (contract_address, member));

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

    pub fn get_public_groups_page(
        env: Env,
        page: u32,
        page_size: u32,
    ) -> Vec<GroupInfo> {
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

    pub fn get_all_groups_info_page(env: Env, page: u32, page_size: u32) -> Vec<GroupInfo> {
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

        let start = (page * page_size) as usize;
        let end = core::cmp::min(start + page_size as usize, groups_info.len() as usize);
        let mut result: Vec<GroupInfo> = Vec::new(&env);
        if start < groups_info.len() as usize {
            for i in start..end {
                if let Some(g) = groups_info.get(i as u32) {
                    result.push_back(g);
                }
            }
        }
        result
    }

    pub fn get_all_groups_info_page_filtered(
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
