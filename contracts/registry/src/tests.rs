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

// ── TASK2: Negative-case public-group exclusion ──────────────────────────────

#[test]
fn test_get_all_public_groups_explicitly_excludes_private() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    // Register one public and one private group.
    let pub_addr =
        deploy_and_register_group(&env, &client, &admin, "pub-g", "Public Only", true, 5);
    let priv_addr =
        deploy_and_register_group(&env, &client, &admin, "priv-g", "Hidden Group", false, 3);

    let public = client.get_all_public_groups();

    // Exactly one group should be returned.
    assert_eq!(public.len(), 1, "Exactly 1 public group expected");

    // That one group must be the public one, not the private one.
    assert_eq!(public.get(0).unwrap().contract_address, pub_addr);

    // Explicit negative assertion: the private group must NOT appear.
    let found = (0..public.len()).any(|i| public.get(i).unwrap().contract_address == priv_addr);
    assert!(!found, "Private group must NOT appear in get_all_public_groups");
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
fn test_get_group_info_panics_for_unknown_group() {
    let env = setup_env();
    let client = create_registry(&env);
    let ghost = Address::generate(&env);
    client.get_group_info(&ghost); // should panic
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
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

    let g1 = deploy_and_register_group(&env, &client, &admin, "g-1", "Group 1", true, 5);
    let g2 = deploy_and_register_group(&env, &client, &admin, "g-2", "Group 2", false, 3);

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

    deploy_and_register_group(&env, &client, &admin, "g-1", "Public Group", true, 5);
    deploy_and_register_group(&env, &client, &admin, "g-2", "Private Group", false, 3);

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
    for i in 1..=5u32 {
        let suffix = format!("g-{i}");
        let label = format!("Group {i}");
        deploy_and_register_group(&env, &client, &admin, &suffix, &label, true, 5);
        assert_eq!(client.get_group_count(), i, "Count must match after each registration");
    }
}

// ── Boundary / edge cases ─────────────────────────────────────────────────────

#[test]
fn test_register_group_with_max_members_zero() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let g = deploy_and_register_group(&env, &client, &admin, "unlimited", "Unlimited Group", true, 0);
    let info = client.get_group_info(&g);
    assert_eq!(info.total_members, 0);
}

#[test]
fn test_register_group_with_single_character_id() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let g = deploy_and_register_group(&env, &client, &admin, "x", "X Group", true, 1);
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

    let mut group_addresses = std::vec::Vec::new();
    for i in 0..n {
        let suffix = format!("group-{i}");
        let label = format!("Group {i}");
        let g = deploy_and_register_group(&env, &client, &admin, &suffix, &label, i % 2 == 0, 10);
        client.add_member(&g, &user);
        group_addresses.push(g);
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

    let g1 = deploy_and_register_group(&env, &client, &admin1, "a1-g", "Admin1 Group", true, 5);
    let g2 = deploy_and_register_group(&env, &client, &admin2, "a2-g", "Admin2 Group", true, 5);
    let g3 = deploy_and_register_group(&env, &client, &admin3, "a3-g", "Admin3 Group", false, 5);

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
    let g1 = deploy_and_register_group(
        &env, &client, &admin1, "savings-club-1", "Monthly Savings Club", true, 10,
    );
    let g2 = deploy_and_register_group(
        &env, &client, &admin2, "family-savings", "Family Savings", false, 5,
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

    let g1 = deploy_and_register_group(&env, &client, &admin, "early", "Early Group", true, 5);
    let t1 = client.get_group_info(&g1).created_at;

    let g2 = deploy_and_register_group(&env, &client, &admin, "later", "Later Group", true, 5);
    let t2 = client.get_group_info(&g2).created_at;

    assert!(t2 > t1, "Later registration must have a higher created_at timestamp");
}

#[test]
fn test_remove_member_removes_group_from_user_groups() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let group = deploy_and_register_group(&env, &client, &admin, "g-rem", "Removable Group", true, 5);

    client.add_member(&group, &member);
    let groups_before = client.get_user_groups(&member);
    assert_eq!(groups_before.len(), 1);

    client.remove_member(&group, &member);
    let groups_after = client.get_user_groups(&member);
    assert_eq!(groups_after.len(), 0);
}

#[test]
fn test_update_group_info_updates_metadata() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let group = deploy_and_register_group(&env, &client, &admin, "g-upd", "Original Name", true, 5);

    let new_name = String::from_str(&env, "Updated Name");
    client.update_group_info(&group, &new_name, &false, &10);

    let info = client.get_group_info(&group);
    assert_eq!(info.name, new_name);
    assert_eq!(info.is_public, false);
    assert_eq!(info.total_members, 10);
}

// ── TASK3: Metadata drift risk demonstration ─────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_register_group_rejects_mismatched_name() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    // Deploy a real savings contract and create a group named "Real Name".
    let savings_id = env.register(SavingsContract, ());
    let savings_client = SavingsContractClient::new(&env, &savings_id);
    savings_client.initialize(&admin);

    let group_id = String::from_str(&env, "drift-id");
    let real_name = String::from_str(&env, "Real Name");
    let start = env.ledger().timestamp() + 3600;

    savings_client.create_group(
        &admin,
        &group_id,
        &real_name,
        &10_000_000_i128,
        &5,
        &Frequency::Weekly,
        &start,
        &true,
        &admin,
        &None,
    );

    // Attempt to register with a *different* name — the registry must reject it.
    // MetadataMismatch = Error(Contract, #5) (100 base + 5 offset).
    client.register_group(
        &savings_id,
        &group_id,
        &String::from_str(&env, "Wrong Name"), // drift!
        &admin,
        &true,
        &5,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_register_group_rejects_mismatched_is_public() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_id = env.register(SavingsContract, ());
    let savings_client = SavingsContractClient::new(&env, &savings_id);
    savings_client.initialize(&admin);

    let group_id = String::from_str(&env, "drift-pub");
    let start = env.ledger().timestamp() + 3600;

    savings_client.create_group(
        &admin,
        &group_id,
        &String::from_str(&env, "Public Group"),
        &10_000_000_i128,
        &5,
        &Frequency::Weekly,
        &start,
        &true, // savings contract says public
        &admin,
        &None,
    );

    // Register with is_public = false — drift must be rejected.
    client.register_group(
        &savings_id,
        &group_id,
        &String::from_str(&env, "Public Group"),
        &admin,
        &false, // drift!
        &5,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_register_group_rejects_mismatched_total_members() {
    let env = setup_env();
    let client = create_registry(&env);
    let admin = Address::generate(&env);

    let savings_id = env.register(SavingsContract, ());
    let savings_client = SavingsContractClient::new(&env, &savings_id);
    savings_client.initialize(&admin);

    let group_id = String::from_str(&env, "drift-members");
    let start = env.ledger().timestamp() + 3600;

    savings_client.create_group(
        &admin,
        &group_id,
        &String::from_str(&env, "Member Group"),
        &10_000_000_i128,
        &5, // savings contract says 5 members
        &Frequency::Weekly,
        &start,
        &true,
        &admin,
        &None,
    );

    // Register with total_members = 10 — drift must be rejected.
    client.register_group(
        &savings_id,
        &group_id,
        &String::from_str(&env, "Member Group"),
        &admin,
        &true,
        &10, // drift!
    );
}

// ── TASK4: contract_address must be a real contract ──────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_register_group_rejects_non_contract_address() {
    let env = setup_env();
    let client = create_registry(&env);

    let non_contract = Address::generate(&env);
    let admin = Address::generate(&env);

    // Address::generate produces an address with no deployed contract code.
    // NotAContract = Error(Contract, #6) (100 base + 6 offset).
    client.register_group(
        &non_contract,
        &String::from_str(&env, "ghost-group"),
        &String::from_str(&env, "Ghost Group"),
        &admin,
        &true,
        &5,
    );
}
