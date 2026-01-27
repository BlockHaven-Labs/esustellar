use crate::{GroupRegistry, GroupRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_test_registry(env: &'_ Env) -> GroupRegistryClient<'_> {
    let contract_id = env.register(GroupRegistry, ());
    GroupRegistryClient::new(env, &contract_id)
}

#[test]
fn test_register_group() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    // Register group
    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);

    // Verify group info
    let info = client.get_group_info(&group_contract);
    assert_eq!(info.group_id, group_id);
    assert_eq!(info.name, name);
    assert_eq!(info.admin, admin);
    assert_eq!(info.is_public, true);
    assert_eq!(info.total_members, 5);

    // Verify group count
    assert_eq!(client.get_group_count(), 1);

    // Verify admin is in user groups
    let admin_groups = client.get_user_groups(&admin);
    assert_eq!(admin_groups.len(), 1);
    assert_eq!(admin_groups.get(0).unwrap(), group_contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_cannot_register_duplicate_group() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    // Register group
    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);

    // Try to register same contract again - should panic
    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);
}

#[test]
fn test_add_member() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    // Register group
    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);

    // Add member
    client.add_member(&group_contract, &member);

    // Verify member's groups
    let member_groups = client.get_user_groups(&member);
    assert_eq!(member_groups.len(), 1);
    assert_eq!(member_groups.get(0).unwrap(), group_contract);
}

#[test]
fn test_add_member_idempotent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let admin = Address::generate(&env);
    let member = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    // Register group
    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);

    // Add member twice
    client.add_member(&group_contract, &member);
    client.add_member(&group_contract, &member);

    // Should still only have 1 group
    let member_groups = client.get_user_groups(&member);
    assert_eq!(member_groups.len(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_add_member_to_nonexistent_group() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let member = Address::generate(&env);

    // Try to add member to unregistered group - should panic
    client.add_member(&group_contract, &member);
}

#[test]
fn test_get_user_groups_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);
    let user = Address::generate(&env);

    // User with no groups
    let groups = client.get_user_groups(&user);
    assert_eq!(groups.len(), 0);
}

#[test]
fn test_user_in_multiple_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group1 = Address::generate(&env);
    let group2 = Address::generate(&env);
    let group3 = Address::generate(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    // Register 3 groups
    client.register_group(
        &group1,
        &String::from_str(&env, "group-1"),
        &String::from_str(&env, "Group 1"),
        &admin,
        &true,
        &5,
    );

    client.register_group(
        &group2,
        &String::from_str(&env, "group-2"),
        &String::from_str(&env, "Group 2"),
        &admin,
        &true,
        &5,
    );

    client.register_group(
        &group3,
        &String::from_str(&env, "group-3"),
        &String::from_str(&env, "Group 3"),
        &admin,
        &false,
        &5,
    );

    // Add user to all groups
    client.add_member(&group1, &user);
    client.add_member(&group2, &user);
    client.add_member(&group3, &user);

    // Verify user is in 3 groups
    let user_groups = client.get_user_groups(&user);
    assert_eq!(user_groups.len(), 3);
}

#[test]
fn test_get_all_public_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group1 = Address::generate(&env);
    let group2 = Address::generate(&env);
    let group3 = Address::generate(&env);
    let admin = Address::generate(&env);

    // Register 2 public groups and 1 private
    client.register_group(
        &group1,
        &String::from_str(&env, "group-1"),
        &String::from_str(&env, "Public Group 1"),
        &admin,
        &true,
        &5,
    );

    client.register_group(
        &group2,
        &String::from_str(&env, "group-2"),
        &String::from_str(&env, "Private Group"),
        &admin,
        &false,
        &3,
    );

    client.register_group(
        &group3,
        &String::from_str(&env, "group-3"),
        &String::from_str(&env, "Public Group 2"),
        &admin,
        &true,
        &7,
    );

    // Get public groups
    let public_groups = client.get_all_public_groups();
    assert_eq!(public_groups.len(), 2);

    // Verify both are public
    for i in 0..public_groups.len() {
        let info = public_groups.get(i).unwrap();
        assert_eq!(info.is_public, true);
    }
}

#[test]
fn test_get_group_info() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group_contract = Address::generate(&env);
    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings Group");

    client.register_group(&group_contract, &group_id, &name, &admin, &true, &5);

    let info = client.get_group_info(&group_contract);
    assert_eq!(info.contract_address, group_contract);
    assert_eq!(info.group_id, group_id);
    assert_eq!(info.name, name);
    assert_eq!(info.admin, admin);
    assert_eq!(info.is_public, true);
    assert_eq!(info.total_members, 5);
    // created_at will be the ledger timestamp (0 in default test env)
    assert_eq!(info.created_at, env.ledger().timestamp());
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_get_group_info_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);
    let group_contract = Address::generate(&env);

    // Try to get info for non-existent group - should panic
    client.get_group_info(&group_contract);
}

#[test]
fn test_get_group_count() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    // Initial count
    assert_eq!(client.get_group_count(), 0);

    let admin = Address::generate(&env);

    // Register 5 groups
    let group1 = Address::generate(&env);
    client.register_group(
        &group1,
        &String::from_str(&env, "group-1"),
        &String::from_str(&env, "Group One"),
        &admin,
        &true,
        &5,
    );

    let group2 = Address::generate(&env);
    client.register_group(
        &group2,
        &String::from_str(&env, "group-2"),
        &String::from_str(&env, "Group Two"),
        &admin,
        &true,
        &5,
    );

    let group3 = Address::generate(&env);
    client.register_group(
        &group3,
        &String::from_str(&env, "group-3"),
        &String::from_str(&env, "Group Three"),
        &admin,
        &true,
        &5,
    );

    let group4 = Address::generate(&env);
    client.register_group(
        &group4,
        &String::from_str(&env, "group-4"),
        &String::from_str(&env, "Group Four"),
        &admin,
        &true,
        &5,
    );

    let group5 = Address::generate(&env);
    client.register_group(
        &group5,
        &String::from_str(&env, "group-5"),
        &String::from_str(&env, "Group Five"),
        &admin,
        &true,
        &5,
    );

    // Verify count
    assert_eq!(client.get_group_count(), 5);
}

#[test]
fn test_get_all_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group1 = Address::generate(&env);
    let group2 = Address::generate(&env);
    let admin = Address::generate(&env);

    client.register_group(
        &group1,
        &String::from_str(&env, "group-1"),
        &String::from_str(&env, "Group 1"),
        &admin,
        &true,
        &5,
    );

    client.register_group(
        &group2,
        &String::from_str(&env, "group-2"),
        &String::from_str(&env, "Group 2"),
        &admin,
        &false,
        &3,
    );

    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 2);
    assert!(all_groups.contains(&group1));
    assert!(all_groups.contains(&group2));
}

#[test]
fn test_get_all_groups_info() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    let group1 = Address::generate(&env);
    let group2 = Address::generate(&env);
    let admin = Address::generate(&env);

    client.register_group(
        &group1,
        &String::from_str(&env, "group-1"),
        &String::from_str(&env, "Public Group"),
        &admin,
        &true,
        &5,
    );

    client.register_group(
        &group2,
        &String::from_str(&env, "group-2"),
        &String::from_str(&env, "Private Group"),
        &admin,
        &false,
        &3,
    );

    let all_info = client.get_all_groups_info();
    assert_eq!(all_info.len(), 2);

    // Verify we got info for both groups
    let mut found_public = false;
    let mut found_private = false;

    for i in 0..all_info.len() {
        let info = all_info.get(i).unwrap();
        if info.is_public {
            found_public = true;
            assert_eq!(info.name, String::from_str(&env, "Public Group"));
        } else {
            found_private = true;
            assert_eq!(info.name, String::from_str(&env, "Private Group"));
        }
    }

    assert!(found_public);
    assert!(found_private);
}

#[test]
fn test_complete_user_journey() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_test_registry(&env);

    // Setup
    let group1 = Address::generate(&env);
    let group2 = Address::generate(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);

    // Admin 1 creates a public group
    client.register_group(
        &group1,
        &String::from_str(&env, "savings-club-1"),
        &String::from_str(&env, "Monthly Savings Club"),
        &admin1,
        &true,
        &10,
    );

    // Admin 2 creates a private group
    client.register_group(
        &group2,
        &String::from_str(&env, "family-savings"),
        &String::from_str(&env, "Family Savings"),
        &admin2,
        &false,
        &5,
    );

    // User discovers public groups
    let public_groups = client.get_all_public_groups();
    assert_eq!(public_groups.len(), 1);
    assert_eq!(
        public_groups.get(0).unwrap().name,
        String::from_str(&env, "Monthly Savings Club")
    );

    // User joins both groups
    client.add_member(&group1, &user);
    client.add_member(&group2, &user);

    // User checks their groups
    let user_groups = client.get_user_groups(&user);
    assert_eq!(user_groups.len(), 2);

    // Verify total group count
    assert_eq!(client.get_group_count(), 2);
}
