use crate::{Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_test_group(env: &Env) -> (Address, SavingsContractClient<'_>) {
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    (admin, client)
}

#[test]
fn test_create_group_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings");

    let group = client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    assert_eq!(group.name, name);
    assert_eq!(group.total_members, 5);
    assert_eq!(group.status, GroupStatus::Open);
}

#[test]
#[should_panic]
fn test_create_group_low_contribution() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-2");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &5_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );
}

#[test]
fn test_join_group() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-3");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 1);

    let member2 = Address::generate(&env);
    client.join_group(&member2, &group_id);

    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 2);

    let member3 = Address::generate(&env);
    client.join_group(&member3, &group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);
}

#[test]
#[should_panic]
fn test_cannot_join_full_group() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-4");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    let member4 = Address::generate(&env);

    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);
    client.join_group(&member4, &group_id); // Should panic
}

#[test]
#[should_panic]
fn test_cannot_join_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-5");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    let member = Address::generate(&env);
    client.join_group(&member, &group_id);
    client.join_group(&member, &group_id); // Should panic
}

#[test]
fn test_contribution_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-6");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);

    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Active);

    // Fast forward time
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);

    let member_data = client.get_member(&admin, &group_id);
    assert_eq!(member_data.status, MemberStatus::PaidCurrentRound);
    assert_eq!(member_data.total_contributed, 100_000_000);

    client.contribute(&member2, &group_id);
    client.contribute(&member3, &group_id);

    let admin_data = client.get_member(&admin, &group_id);
    assert!(admin_data.has_received_payout);
}

#[test]
fn test_payout_order() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-7");
    let name = String::from_str(&env, "Payout Order Test");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);

    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);

    assert_eq!(client.get_member(&admin, &group_id).join_order, 0);
    assert_eq!(client.get_member(&member2, &group_id).join_order, 1);
    assert_eq!(client.get_member(&member3, &group_id).join_order, 2);

    let group = client.get_group(&group_id);
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&member2, &group_id);
    client.contribute(&member3, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.get(0).unwrap().recipient, admin);
}

#[test]
fn test_get_round_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group");
    let name = String::from_str(&env, "Test Group");

    let start_time = env.ledger().timestamp() + 86400; // Tomorrow

    // Create group
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Weekly,
        &start_time,
        &true,
    );

    // Get round 1 deadline
    let deadline = client.get_round_deadline(&group_id, &1);

    // Should be start_time + 1 week
    assert_eq!(deadline, start_time + 604800);
}

#[test]
fn test_get_user_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group");
    let name = String::from_str(&env, "Test Group");

    // User has no groups initially
    let groups = client.get_user_groups(&user);
    assert_eq!(groups.len(), 0);

    // User creates a group (auto-joins as admin)
    client.create_group(
        &user,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    // User should now have 1 group
    let groups = client.get_user_groups(&user);
    assert_eq!(groups.len(), 1);
    assert_eq!(groups.get(0).unwrap(), group_id);
}

#[test]
fn test_get_all_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    // Initially no groups
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 0);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    let group_id1 = String::from_str(&env, "group-1");
    let group_id2 = String::from_str(&env, "group-2");
    let name = String::from_str(&env, "Test Group");

    // Create first group
    client.create_group(
        &admin1,
        &group_id1,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    // Should have 1 group
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 1);

    // Create second group
    client.create_group(
        &admin2,
        &group_id2,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    // Should have 2 groups
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 2);
    assert!(all_groups.contains(group_id1));
    assert!(all_groups.contains(group_id2));
}

#[test]
fn test_user_joins_multiple_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let group_id1 = String::from_str(&env, "group-1");
    let group_id2 = String::from_str(&env, "group-2");
    let name = String::from_str(&env, "Test Group");

    // Create two groups
    client.create_group(
        &admin,
        &group_id1,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    client.create_group(
        &admin,
        &group_id2,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    // User joins both groups
    client.join_group(&user, &group_id1);
    client.join_group(&user, &group_id2);

    // User should be in 2 groups
    let user_groups = client.get_user_groups(&user);
    assert_eq!(user_groups.len(), 2);
    assert!(user_groups.contains(group_id1));
    assert!(user_groups.contains(group_id2));
}

// NEW TEST: Multiple groups isolation test
#[test]
fn test_multiple_groups_isolated_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let group_id1 = String::from_str(&env, "isolated-group-1");
    let group_id2 = String::from_str(&env, "isolated-group-2");
    let name1 = String::from_str(&env, "Group One");
    let name2 = String::from_str(&env, "Group Two");

    // Create two different groups with different parameters
    client.create_group(
        &admin1,
        &group_id1,
        &name1,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    client.create_group(
        &admin2,
        &group_id2,
        &name2,
        &200_000_000,
        &4,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 172800),
        &false,
    );

    // Verify groups are separate
    let group1 = client.get_group(&group_id1);
    let group2 = client.get_group(&group_id2);

    assert_eq!(group1.contribution_amount, 100_000_000);
    assert_eq!(group2.contribution_amount, 200_000_000);
    assert_eq!(group1.total_members, 3);
    assert_eq!(group2.total_members, 4);

    // User1 joins group1, user2 joins group2
    client.join_group(&user1, &group_id1);
    client.join_group(&user2, &group_id2);

    // Verify members are isolated
    let members1 = client.get_members(&group_id1);
    let members2 = client.get_members(&group_id2);

    assert_eq!(members1.len(), 2); // admin1 + user1
    assert_eq!(members2.len(), 2); // admin2 + user2
    assert!(members1.contains(&user1));
    assert!(!members1.contains(&user2));
    assert!(members2.contains(&user2));
    assert!(!members2.contains(&user1));
}

// NEW TEST: Multiple groups full lifecycle
#[test]
fn test_multiple_groups_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    let group_id1 = String::from_str(&env, "lifecycle-group-1");
    let group_id2 = String::from_str(&env, "lifecycle-group-2");
    let name = String::from_str(&env, "Test Group");

    // Create two groups
    client.create_group(
        &admin1,
        &group_id1,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    client.create_group(
        &admin2,
        &group_id2,
        &name,
        &150_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    // Fill both groups
    let member1_g1 = Address::generate(&env);
    let member2_g1 = Address::generate(&env);
    client.join_group(&member1_g1, &group_id1);
    client.join_group(&member2_g1, &group_id1);

    let member1_g2 = Address::generate(&env);
    let member2_g2 = Address::generate(&env);
    client.join_group(&member1_g2, &group_id2);
    client.join_group(&member2_g2, &group_id2);

    // Both should be active
    assert_eq!(client.get_group(&group_id1).status, GroupStatus::Active);
    assert_eq!(client.get_group(&group_id2).status, GroupStatus::Active);

    // Fast forward time
    let start_time = env.ledger().timestamp() + 101;
    env.ledger().with_mut(|li| {
        li.timestamp = start_time;
    });

    // Group 1 - Round 1 contributions
    client.contribute(&admin1, &group_id1);
    client.contribute(&member1_g1, &group_id1);
    client.contribute(&member2_g1, &group_id1);

    // Verify group 1 payout happened
    let payouts_g1 = client.get_round_payouts(&group_id1, &1);
    assert_eq!(payouts_g1.len(), 1);
    assert_eq!(payouts_g1.get(0).unwrap().amount, 294_000_000); // 100M * 3 - 2% fee

    // Group 2 - Round 1 contributions
    client.contribute(&admin2, &group_id2);
    client.contribute(&member1_g2, &group_id2);
    client.contribute(&member2_g2, &group_id2);

    // Verify group 2 payout happened with different amount
    let payouts_g2 = client.get_round_payouts(&group_id2, &1);
    assert_eq!(payouts_g2.len(), 1);
    assert_eq!(payouts_g2.get(0).unwrap().amount, 441_000_000); // 150M * 3 - 2% fee

    // Verify contributions are isolated
    let contribs_g1 = client.get_round_contributions(&group_id1, &1);
    let contribs_g2 = client.get_round_contributions(&group_id2, &1);
    assert_eq!(contribs_g1.len(), 3);
    assert_eq!(contribs_g2.len(), 3);
}

// NEW TEST: Verify no panics when creating multiple groups
#[test]
fn test_create_multiple_groups_no_panic() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let name = String::from_str(&env, "Test Group");

    // Create 5 different groups - should not panic
    for i in 1..=5 {
        let group_id = match i {
            1 => String::from_str(&env, "group-1"),
            2 => String::from_str(&env, "group-2"),
            3 => String::from_str(&env, "group-3"),
            4 => String::from_str(&env, "group-4"),
            _ => String::from_str(&env, "group-5"),
        };
        client.create_group(
            &admin,
            &group_id,
            &name,
            &100_000_000,
            &5,
            &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400),
            &true,
        );
    }

    // Verify all groups exist
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 5);
}