use crate::{GroupRegistry, GroupRegistryClient};
use esustellar_savings::{
    Error as SavingsError, Frequency, SavingsContract, SavingsContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, String, Vec,
};

// ── Test fixtures & helpers ───────────────────────────────────────────────────

/// Create a registry client with a deterministic ledger state.
/// The timestamp is set far enough in the future that savings contracts
/// can create groups with start_timestamps in the future.
fn setup_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 5_000_000_000,
        protocol_version: 22,
        sequence_number: 1_000,
        network_id: [0u8; 32],
        base_reserve: 10,
        min_temp_entry_ttl: 50_000,
        min_persistent_entry_ttl: 50_000,
        max_entry_ttl: 50_000,
    });
    env
}

fn create_registry(env: &Env) -> GroupRegistryClient<'_> {
    let contract_id = env.register(GroupRegistry, ());
    GroupRegistryClient::new(env, &contract_id)
}

/// Deploy a savings contract, initialize it, create a group, and register
/// that group in the registry with matching metadata.  Returns the savings
/// contract address.
fn deploy_and_register_group(
    env: &Env,
    registry: &GroupRegistryClient<'_>,
    admin: &Address,
    group_id: &str,
    name: &str,
    is_public: bool,
    total_members: u32,
) -> Address {
    // Increment ledger timestamp by 1 second between calls to avoid
    // hitting the per-admin 24-hour rate limit in the savings contract.
    let current_ts = env.ledger().timestamp();
    env.ledger().set(LedgerInfo {
        timestamp: current_ts + 1,
        protocol_version: 22,
        sequence_number: 1_001,
        network_id: [0u8; 32],
        base_reserve: 10,
        min_temp_entry_ttl: 50_000,
        min_persistent_entry_ttl: 50_000,
        max_entry_ttl: 50_000,
    });

    // Deploy and initialize a real savings contract.
    let savings_id = env.register(SavingsContract, ());
    let savings_client = SavingsContractClient::new(env, &savings_id);
    savings_client.initialize(admin);

    let start_timestamp = env.ledger().timestamp() + 3600;

    savings_client.create_group(
        admin,
        &String::from_str(env, group_id),
        &String::from_str(env, name),
        &10_000_000_i128,                   // MIN_CONTRIBUTION
        &total_members,
        &Frequency::Weekly,
        &start_timestamp,
        &is_public,
        admin,                               // treasury
        &None,                               // token_address
    );

    let savings_addr = savings_id.clone();

    // Register in the registry with metadata matching the savings contract.
    registry.register_group(
        &savings_addr,
        &String::from_str(env, group_id),
        &String::from_str(env, name),
        admin,
        &is_public,
        &total_members,
    );

    savings_addr
}

// ── Registration ──────────────────────────────────────────────────────────────

#[test]
fn test_register_group_stores_all_fields() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_addr =
        deploy_and_register_group(&env, &client, &admin, "test-group-1", "Test Savings Group", true, 5);

    let info = client.get_group_info(&savings_addr);
    assert_eq!(info.contract_address, savings_addr, "contract_address must match");
    assert_eq!(info.group_id, String::from_str(&env, "test-group-1"), "group_id must match");
    assert_eq!(info.name, String::from_str(&env, "Test Savings Group"), "name must match");
    assert_eq!(info.admin, admin, "admin must match");
    assert_eq!(info.is_public, true, "is_public must match");
    assert_eq!(info.total_members, 5, "total_members must match");
    assert_eq!(
        info.created_at,
        env.ledger().timestamp(),
        "created_at must be the ledger timestamp"
    );
}

#[test]
fn test_register_group_increments_count() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    assert_eq!(client.get_group_count(), 0, "Initial count must be 0");

    deploy_and_register_group(&env, &client, &admin, "g-1", "Group One", true, 5);
    assert_eq!(client.get_group_count(), 1);

    deploy_and_register_group(&env, &client, &admin, "g-2", "Group Two", true, 5);
    assert_eq!(client.get_group_count(), 2);
}

#[test]
fn test_register_group_adds_admin_to_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_addr =
        deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);

    let admin_groups = client.get_user_groups(&admin);
    assert_eq!(admin_groups.len(), 1);
    assert_eq!(admin_groups.get(0).unwrap(), savings_addr);
}

#[test]
fn test_register_private_group_not_in_public_listing() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    deploy_and_register_group(&env, &client, &admin, "private-g", "Secret Group", false, 5);

    assert_eq!(
        client.get_all_public_groups().len(),
        0,
        "Private group must not appear in public listing"
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_cannot_register_duplicate_group() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_addr =
        deploy_and_register_group(&env, &client, &admin, "dup-group", "Duplicate", true, 5);

    // Second registration with the same contract address must panic.
    // The duplicate check (GroupAlreadyRegistered) fires before the
    // cross-contract call, so it hits the same error regardless.
    client.register_group(
        &savings_addr,
        &String::from_str(&env, "dup-group"),
        &String::from_str(&env, "Duplicate"),
        &admin,
        &true,
        &5,
    );
}

#[test]
fn test_register_groups_with_same_name_different_contracts_allowed() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    // Same name, different contract addresses — should both succeed.
    deploy_and_register_group(&env, &client, &admin, "id-a", "Same Name", true, 5);
    deploy_and_register_group(&env, &client, &admin, "id-b", "Same Name", true, 5);

    assert_eq!(client.get_group_count(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_cannot_register_duplicate_group_id_different_contract() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    // First: create a group_id "same-group-id" in a real savings contract
    // and register it.  The group_id gets stored in RegisteredGroupId.
    let savings_a = deploy_and_register_group(
        &env, &client, &admin, "same-group-id", "Group One", true, 5,
    );

    // Second: deploy a different savings contract with a different group_id,
    // but try to register it with the *same* group_id.
    // The duplicate group_id check fires before the cross-contract call.
    let savings_b_id = env.register(SavingsContract, ());
    let savings_b = SavingsContractClient::new(&env, &savings_b_id);
    savings_b.initialize(&admin);

    let group_id_dup = String::from_str(&env, "same-group-id");
    let name2 = String::from_str(&env, "Group Two");

    // NOTE: This should panic because the group_id "same-group-id" is
    // already registered via savings_a.  The duplicate check at the top
    // of register_group catches it.
    client.register_group(
        &savings_b_id,
        &group_id_dup,
        &name2,
        &admin,
        &true,
        &5,
    );
}

#[test]
fn test_can_register_group_id_after_unregister() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_a = deploy_and_register_group(
        &env, &client, &admin, "reusable-group-id", "Reusable Group", true, 5,
    );
    client.unregister_group(&savings_a, &admin);

    // After unregistering savings_a, registering group_id with a new
    // savings contract should succeed.
    let savings_b = deploy_and_register_group(
        &env, &client, &admin, "reusable-group-id", "Reusable Group", true, 5,
    );
    assert_eq!(
        client.get_group_info(&savings_b).group_id,
        String::from_str(&env, "reusable-group-id")
    );
}

// ── Membership ────────────────────────────────────────────────────────────────

#[test]
fn test_add_member_appears_in_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    client.add_member(&g, &member);

    let groups = client.get_user_groups(&member);
    assert_eq!(groups.len(), 1);
    assert_eq!(groups.get(0).unwrap(), g);
}

#[test]
fn test_add_member_idempotent() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    client.add_member(&g, &member);
    client.add_member(&g, &member); // duplicate — must be ignored

    let groups = client.get_user_groups(&member);
    assert_eq!(groups.len(), 1, "Duplicate add_member must not create extra entries");
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_add_member_to_nonexistent_group_panics() {
    let env = setup_env();
    let client = create_registry(&env);

    let ghost = Address::generate(&env);
    let member = Address::generate(&env);
    client.add_member(&ghost, &member);
}

#[test]
fn test_admin_adding_self_as_member_idempotent() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    // Admin is already in user_groups from registration; adding explicitly should be idempotent.
    client.add_member(&g, &admin);

    let groups = client.get_user_groups(&admin);
    assert_eq!(groups.len(), 1, "Admin re-added must not duplicate group entry");
}

#[test]
fn test_user_in_multiple_groups_shows_all() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let g1 = deploy_and_register_group(&env, &client, &admin, "g-1", "Group 1", true, 5);
    let g2 = deploy_and_register_group(&env, &client, &admin, "g-2", "Group 2", true, 5);
    let g3 = deploy_and_register_group(&env, &client, &admin, "g-3", "Group 3", false, 5);

    client.add_member(&g1, &user);
    client.add_member(&g2, &user);
    client.add_member(&g3, &user);

    let user_groups = client.get_user_groups(&user);
    assert_eq!(user_groups.len(), 3);
    assert!(user_groups.contains(&g1));
    assert!(user_groups.contains(&g2));
    assert!(user_groups.contains(&g3));
}

// ── Remove member ─────────────────────────────────────────────────────────────

#[test]
fn test_remove_member_updates_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    client.add_member(&g, &member);

    client.remove_member(&g, &member);

    let groups = client.get_user_groups(&member);
    assert_eq!(groups.len(), 0, "Member must be removed from user_groups");
}

#[test]
fn test_remove_member_from_one_of_multiple_groups_leaves_others() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let g1 = deploy_and_register_group(&env, &client, &admin, "g-1", "Group 1", true, 5);
    let g2 = deploy_and_register_group(&env, &client, &admin, "g-2", "Group 2", true, 5);

    client.add_member(&g1, &member);
    client.add_member(&g2, &member);

    client.remove_member(&g1, &member);

    let groups = client.get_user_groups(&member);
    assert_eq!(groups.len(), 1);
    assert_eq!(groups.get(0).unwrap(), g2);
}

#[test]
fn test_remove_nonexistent_member_is_idempotent() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let stranger = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    // Removing a user who was never a member must not panic.
    client.remove_member(&g, &stranger);

    assert_eq!(client.get_user_groups(&stranger).len(), 0);
}

// ── Admin transfer ────────────────────────────────────────────────────────────

#[test]
fn test_transfer_admin_updates_group_info() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    client.transfer_admin(&g, &admin, &new_admin);

    let info = client.get_group_info(&g);
    assert_eq!(info.admin, new_admin, "Admin must be updated after transfer");
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_transfer_admin_by_non_admin_panics() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "g-1", "Group", true, 5);
    client.transfer_admin(&g, &impostor, &new_admin);
}

// ── Public / private listing ──────────────────────────────────────────────────

#[test]
fn test_get_all_public_groups_returns_only_public() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    deploy_and_register_group(&env, &client, &admin, "pub-1", "Public Group 1", true, 5);
    deploy_and_register_group(&env, &client, &admin, "priv-1", "Private Group", false, 3);
    deploy_and_register_group(&env, &client, &admin, "pub-2", "Public Group 2", true, 7);

    let public = client.get_all_public_groups();
    assert_eq!(public.len(), 2, "Only 2 public groups should be returned");

    for i in 0..public.len() {
        assert!(public.get(i).unwrap().is_public, "Every returned group must be public");
    }
}

#[test]
fn test_get_all_public_groups_empty_when_all_private() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    deploy_and_register_group(&env, &client, &admin, "p1", "Private A", false, 5);
    deploy_and_register_group(&env, &client, &admin, "p2", "Private B", false, 5);

    assert_eq!(client.get_all_public_groups().len(), 0);
}

