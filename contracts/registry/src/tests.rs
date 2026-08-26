use crate::{GroupRegistry, GroupRegistryClient};
use soroban_sdk::{testutils::{Address as _, Ledger, LedgerInfo}, Address, Env, String, Vec};
use esustellar_savings::{SavingsContract, SavingsContractClient, SavingsGroup, Frequency, GroupStatus};

// ── Test fixtures & helpers ───────────────────────────────────────────────────

/// Create a registry client with a deterministic ledger state.
fn setup_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 1_700_000_000,
        protocol_version: 23,
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

/// Register a group with default safe values and return the group contract address.
fn register_group(
    env: &Env,
    client: &GroupRegistryClient<'_>,
    id_suffix: &str,
    name_str: &str,
    admin: &Address,
    is_public: bool,
    max_members: u32,
) -> Address {
    // Register and mock a savings contract for the cross-contract call
    let savings_contract_id = env.register(SavingsContract, ());
    let savings_client = SavingsContractClient::new(env, &savings_contract_id);
    
    // Initialize the savings contract
    savings_client.initialize(&admin.clone());
    
    // Create a mock savings group within the savings contract's context
    let mock_group = SavingsGroup {
        group_id: String::from_str(env, id_suffix),
        admin: admin.clone(),
        name: String::from_str(env, name_str),
        contribution_amount: 100_000_000,
        total_members: max_members,
        frequency: Frequency::Monthly,
        start_timestamp: env.ledger().timestamp() + 86400,
        status: GroupStatus::Open,
        is_public,
        current_round: 0,
        platform_fee_percent: 200,
        treasury: Address::generate(env),
        token_address: None,
        payout_order: Vec::new(env),
    };
    
    env.as_contract(&savings_contract_id, || {
        env.storage().persistent().set(&esustellar_savings::DataKey::Group(String::from_str(env, id_suffix)), &mock_group);
    });
    
    // Call register_group without total_members parameter (derived from savings contract)
    client.register_group(
        &savings_contract_id,
        &String::from_str(env, id_suffix),
        &String::from_str(env, name_str),
        admin,
        &is_public,
    );
    savings_contract_id
}

// ── Registration ──────────────────────────────────────────────────────────────

#[test]
fn test_register_group_stores_all_fields() {
    let env = setup_env();
    let client = create_registry(&env);

    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    let group_contract = register_group(&env, &client, "test-group-1", "Test Savings Group", &admin, true, 5);

    let info = client.get_group_info(&group_contract);
    assert_eq!(info.contract_address, group_contract, "contract_address must match");
    assert_eq!(info.group_id, group_id, "group_id must match");
    assert_eq!(info.name, name, "name must match");
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

    register_group(&env, &client, "g-1", "Group One", &admin, true, 5);
    assert_eq!(client.get_group_count(), 1);

    register_group(&env, &client, "g-2", "Group Two", &admin, true, 5);
    assert_eq!(client.get_group_count(), 2);
}

#[test]
fn test_register_group_adds_admin_to_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);

    let admin_groups = client.get_user_groups(&admin);
    assert_eq!(admin_groups.len(), 1);
    assert_eq!(admin_groups.get(0).unwrap(), g);
}

#[test]
fn test_register_private_group_not_in_public_listing() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    register_group(&env, &client, "private-g", "Secret Group", &admin, false, 5);

    assert_eq!(
        client.get_all_public_groups().len(),
        0,
        "Private group must not appear in public listing"
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #100)")]
fn test_cannot_register_duplicate_group() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let _g = register_group(&env, &client, "dup-group", "Duplicate", &admin, true, 5);
    // Second registration with the same contract address must panic.
    register_group(&env, &client, "dup-group", "Duplicate", &admin, true, 5);
}

#[test]
fn test_register_groups_with_same_name_different_contracts_allowed() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    // Same name, different contract addresses — should both succeed.
    register_group(&env, &client, "id-a", "Same Name", &admin, true, 5);
    register_group(&env, &client, "id-b", "Same Name", &admin, true, 5);

    assert_eq!(client.get_group_count(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #100)")]
fn test_cannot_register_duplicate_group_id_different_contract() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let _group_id = String::from_str(&env, "same-group-id");

    register_group(&env, &client, "same-group-id", "Group One", &admin, true, 5);
    // Second registration with a different contract address but same group_id must panic.
    register_group(&env, &client, "same-group-id", "Group Two", &admin, true, 5);
}

#[test]
fn test_can_register_group_id_after_unregister() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let contract_a = register_group(&env, &client, "reusable-group-id", "Reusable Group", &admin, true, 5);
    client.unregister_group(&contract_a, &admin);

    // After unregistering contract_a, registering group_id with contract_b should succeed.
    let contract_b = register_group(&env, &client, "reusable-group-id", "Reusable Group", &admin, true, 5);
    assert_eq!(client.get_group_info(&contract_b).group_id, String::from_str(&env, "reusable-group-id"));
}

// ── Membership ────────────────────────────────────────────────────────────────

#[test]
fn test_add_member_appears_in_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
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

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
    client.add_member(&g, &member);
    client.add_member(&g, &member); // duplicate — must be ignored

    let groups = client.get_user_groups(&member);
    assert_eq!(groups.len(), 1, "Duplicate add_member must not create extra entries");
}

#[test]
#[should_panic(expected = "Error(Contract, #101)")]
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

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
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

    let g1 = register_group(&env, &client, "g-1", "Group 1", &admin, true, 5);
    let g2 = register_group(&env, &client, "g-2", "Group 2", &admin, true, 5);
    let g3 = register_group(&env, &client, "g-3", "Group 3", &admin, false, 5);

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

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
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

    let g1 = register_group(&env, &client, "g-1", "Group 1", &admin, true, 5);
    let g2 = register_group(&env, &client, "g-2", "Group 2", &admin, true, 5);

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

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
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

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
    client.transfer_admin(&g, &admin, &new_admin);

    let info = client.get_group_info(&g);
    assert_eq!(info.admin, new_admin, "Admin must be updated after transfer");
}

#[test]
#[should_panic(expected = "Error(Contract, #102)")]
fn test_transfer_admin_by_non_admin_panics() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let g = register_group(&env, &client, "g-1", "Group", &admin, true, 5);
    client.transfer_admin(&g, &impostor, &new_admin);
}

// ── Public / private listing ──────────────────────────────────────────────────

#[test]
fn test_get_all_public_groups_returns_only_public() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    register_group(&env, &client, "pub-1", "Public Group 1", &admin, true, 5);
    register_group(&env, &client, "priv-1", "Private Group", &admin, false, 3);
    register_group(&env, &client, "pub-2", "Public Group 2", &admin, true, 7);

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

    register_group(&env, &client, "p1", "Private A", &admin, false, 5);
    register_group(&env, &client, "p2", "Private B", &admin, false, 5);

    assert_eq!(client.get_all_public_groups().len(), 0);
}

// ── Queries ───────────────────────────────────────────────────────────────────

#[test]
fn test_get_user_groups_empty_for_unknown_user() {
    let env = setup_env();
    let client = create_registry(&env);
    let stranger = Address::generate(&env);

    assert_eq!(client.get_user_groups(&stranger).len(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #101)")]
fn test_get_group_info_panics_for_unknown_group() {
    let env = setup_env();
    let client = create_registry(&env);
    let ghost = Address::generate(&env);
    client.get_group_info(&ghost); // should panic
}

#[test]
#[should_panic(expected = "Error(Contract, #101)")]
fn test_get_group_info_not_found() {
    let env = setup_env();
    let client = create_registry(&env);
    client.get_group_info(&Address::generate(&env));
}

#[test]
fn test_get_all_groups_contains_both_public_and_private() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g1 = register_group(&env, &client, "g-1", "Group 1", &admin, true, 5);
    let g2 = register_group(&env, &client, "g-2", "Group 2", &admin, false, 3);

    let all = client.get_all_groups();
    assert_eq!(all.len(), 2);
    assert!(all.contains(&g1));
    assert!(all.contains(&g2));
}

#[test]
fn test_get_all_groups_info_includes_all_fields() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    register_group(&env, &client, "g-1", "Public Group", &admin, true, 5);
    register_group(&env, &client, "g-2", "Private Group", &admin, false, 3);

    let all_info = client.get_all_groups_info();
    assert_eq!(all_info.len(), 2);

    let mut found_public = false;
    let mut found_private = false;

    for i in 0..all_info.len() {
        let info = all_info.get(i).unwrap();
        if info.is_public {
            found_public = true;
            assert_eq!(info.name, String::from_str(&env, "Public Group"));
            assert_eq!(info.total_members, 5);
        } else {
            found_private = true;
            assert_eq!(info.name, String::from_str(&env, "Private Group"));
            assert_eq!(info.total_members, 3);
        }
        // Every record must have a non-zero created_at.
        assert!(info.created_at > 0, "created_at must be populated");
    }

    assert!(found_public, "Public group must be in get_all_groups_info");
    assert!(found_private, "Private group must be in get_all_groups_info");
}

#[test]
fn test_get_group_count_exact_five() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    assert_eq!(client.get_group_count(), 0);
    register_group(&env, &client, "g-1", "Group 1", &admin, true, 5);
    assert_eq!(client.get_group_count(), 1);
    register_group(&env, &client, "g-2", "Group 2", &admin, true, 5);
    assert_eq!(client.get_group_count(), 2);
    register_group(&env, &client, "g-3", "Group 3", &admin, true, 5);
    assert_eq!(client.get_group_count(), 3);
    register_group(&env, &client, "g-4", "Group 4", &admin, true, 5);
    assert_eq!(client.get_group_count(), 4);
    register_group(&env, &client, "g-5", "Group 5", &admin, true, 5);
    assert_eq!(client.get_group_count(), 5, "Count must match after each registration");
}

// ── Boundary / edge cases ─────────────────────────────────────────────────────

#[test]
fn test_register_group_with_max_members_zero() {
    // Some registries allow 0 max_members to mean "unlimited" — verify no panic.
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g = register_group(&env, &client, "unlimited", "Unlimited Group", &admin, true, 0);
    let info = client.get_group_info(&g);
    assert_eq!(info.total_members, 0);
}

#[test]
fn test_register_group_with_single_character_id() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let g = register_group(&env, &client, "x", "X Group", &admin, true, 1);
    assert_eq!(
        client.get_group_info(&g).group_id,
        String::from_str(&env, "x")
    );
}

#[test]
fn test_large_number_of_groups_and_members() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let n = 20u32;

    let mut group_addresses: Vec<Address> = Vec::new(&env);
    // Create 20 groups with alternating public/private
    let group_ids = ["group-0", "group-1", "group-2", "group-3", "group-4", "group-5", "group-6", "group-7", "group-8", "group-9",
                      "group-a0", "group-a1", "group-a2", "group-a3", "group-a4", "group-a5", "group-a6", "group-a7", "group-a8", "group-a9"];
    let group_names = ["Group 0", "Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6", "Group 7", "Group 8", "Group 9",
                       "Group A0", "Group A1", "Group A2", "Group A3", "Group A4", "Group A5", "Group A6", "Group A7", "Group A8", "Group A9"];
    for i in 0..20u32 {
        let g = register_group(&env, &client, group_ids[i as usize], group_names[i as usize], &admin, i % 2 == 0, 10);
        client.add_member(&g, &user);
        group_addresses.push_back(g);
    }

    assert_eq!(client.get_group_count(), n, "Count must equal n");
    assert_eq!(
        client.get_user_groups(&user).len(),
        n,
        "User must be in all n groups"
    );
    assert_eq!(
        client.get_all_public_groups().len(),
        n / 2,
        "Half the groups are public"
    );
}

#[test]
fn test_multiple_admins_each_own_one_group() {
    let env = setup_env();
    let client = create_registry(&env);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);

    let g1 = register_group(&env, &client, "a1-g", "Admin1 Group", &admin1, true, 5);
    let g2 = register_group(&env, &client, "a2-g", "Admin2 Group", &admin2, true, 5);
    let g3 = register_group(&env, &client, "a3-g", "Admin3 Group", &admin3, false, 5);

    // Each admin is in exactly their own group.
    let g1_groups = client.get_user_groups(&admin1);
    assert_eq!(g1_groups.len(), 1);
    assert_eq!(g1_groups.get(0).unwrap(), g1);

    let g2_groups = client.get_user_groups(&admin2);
    assert_eq!(g2_groups.len(), 1);
    assert_eq!(g2_groups.get(0).unwrap(), g2);

    let g3_groups = client.get_user_groups(&admin3);
    assert_eq!(g3_groups.len(), 1);
    assert_eq!(g3_groups.get(0).unwrap(), g3);
}

// ── Integration / journey ─────────────────────────────────────────────────────

#[test]
fn test_complete_user_journey() {
    let env = setup_env();
    let client = create_registry(&env);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);

    // 1. Two admins each create a group.
    let g1 = register_group(
        &env, &client, "savings-club-1", "Monthly Savings Club", &admin1, true, 10,
    );
    let g2 = register_group(
        &env, &client, "family-savings", "Family Savings", &admin2, false, 5,
    );

    // 2. User discovers public groups.
    let public = client.get_all_public_groups();
    assert_eq!(public.len(), 1);
    assert_eq!(public.get(0).unwrap().name, String::from_str(&env, "Monthly Savings Club"));

    // 3. User joins both groups.
    client.add_member(&g1, &user);
    client.add_member(&g2, &user);

    let user_groups = client.get_user_groups(&user);
    assert_eq!(user_groups.len(), 2);
    assert!(user_groups.contains(&g1));
    assert!(user_groups.contains(&g2));

    // 4. User leaves the public group.
    client.remove_member(&g1, &user);
    let user_groups_after = client.get_user_groups(&user);
    assert_eq!(user_groups_after.len(), 1);
    assert_eq!(user_groups_after.get(0).unwrap(), g2);

    // 5. Admin1 transfers their group to a new admin.
    let new_admin = Address::generate(&env);
    client.transfer_admin(&g1, &admin1, &new_admin);
    assert_eq!(client.get_group_info(&g1).admin, new_admin);

    // 6. Overall count is unchanged.
    assert_eq!(client.get_group_count(), 2);
}

#[test]
fn test_timestamps_are_monotonic_across_registrations() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g1 = register_group(&env, &client, "early", "Early Group", &admin, true, 5);
    let t1 = client.get_group_info(&g1).created_at;

    // Advance the ledger timestamp.
    env.ledger().set(LedgerInfo {
        timestamp: 1_700_001_000,
        protocol_version: 23,
        sequence_number: 1_001,
        network_id: [0u8; 32],
        base_reserve: 10,
        min_temp_entry_ttl: 50_000,
        min_persistent_entry_ttl: 50_000,
        max_entry_ttl: 50_000,
    });

    let g2 = register_group(&env, &client, "later", "Later Group", &admin, true, 5);
    let t2 = client.get_group_info(&g2).created_at;

    assert!(t2 > t1, "Later registration must have a higher created_at timestamp");

    fn registry_test(env: &Env) -> GroupRegistryClient<'_> {
    let contract_id = env.register(GroupRegistry, ());
    GroupRegistryClient::new(env, &contract_id)
}
}
