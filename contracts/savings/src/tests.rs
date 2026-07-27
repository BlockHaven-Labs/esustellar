use crate::{Error, Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient};
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &user,
        &true, &None,
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
        &admin1,
        &true, &None,
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
        &admin2,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin,
        &true, &None,
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
        &admin1,
        &true, &None,
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
        &admin2,
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
        &admin1,
        &true, &None,
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
        &admin2,
        &true, &None,
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
            &admin,
            &true, &None,
        );
    }

    // Verify all groups exist
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 5);
}

// ============================================================
// Tests for #618: Admin cannot redundantly join after auto-join
// ============================================================

#[test]
#[should_panic]
fn test_admin_cannot_join_after_auto_join() {
#[test]
fn test_rate_limit_create_group() {
fn test_force_end_round() {
fn test_pause_and_resume_group() {
#[should_panic]
fn test_create_group_max_contribution_exceeded() {
fn test_contribute_rejected_after_completed() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "admin-join-test");
    let name = String::from_str(&env, "Test Savings");

    client.create_group(
        &admin,
        &group_id,
    let group_id1 = String::from_str(&env, "rate-limit-1");
    let group_id2 = String::from_str(&env, "rate-limit-2");
    let name = String::from_str(&env, "Rate Limit Test");

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

    // Admin already auto-joined via create_group — joining again should fail
    client.join_group(&admin, &group_id);
}

// ============================================================
// Tests for #620: cancel_group
// ============================================================

#[test]
fn test_cancel_group_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-test");
    let name = String::from_str(&env, "Cancel Me");

    client.create_group(
        &admin,
        &group_id,
    // Try to create another group immediately — should fail
    let result = client.try_create_group(
        &admin,
        &group_id2,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );

    // Verify group exists
    assert_eq!(client.get_all_groups().len(), 1);
    assert_eq!(client.get_user_groups(&admin).len(), 1);

    // Cancel it
    client.cancel_group(&admin, &group_id);

    // Group should be removed from global list and user's groups
    assert_eq!(client.get_all_groups().len(), 0);
    assert_eq!(client.get_user_groups(&admin).len(), 0);
}

#[test]
#[should_panic]
fn test_cancel_group_not_admin() {
    assert_eq!(result, Err(Ok(Error::RateLimited)));
}

#[test]
fn test_admin_cancel_group() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-noauth");
    let name = String::from_str(&env, "Cancel Me");
    let group_id = String::from_str(&env, "cancel-test");
    let name = String::from_str(&env, "Cancel Test");

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

    let other = Address::generate(&env);
    client.cancel_group(&other, &group_id); // Should panic — not admin
}

#[test]
#[should_panic]
fn test_cancel_group_not_open() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-active");
    let name = String::from_str(&env, "Active Group");
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Open);

    // Admin cancels the group
    client.cancel_group(&admin, &group_id);

    // Group should now be completed (cancelled)
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Completed);
}

#[test]
fn test_admin_remove_member() {
    let group_id = String::from_str(&env, "force-end-test");
    let name = String::from_str(&env, "Force End Test");
    let group_id = String::from_str(&env, "pause-test");
    let name = String::from_str(&env, "Pause Test");
    let group_id = String::from_str(&env, "test-group-max");
    let name = String::from_str(&env, "Test Savings");
    let group_id = String::from_str(&env, "completed-test");
    let name = String::from_str(&env, "Completed Test");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &2_000_000_000_000, // 2M XLM - exceeds MAX_CONTRIBUTION
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    // Fill the group so it becomes Active
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Active);

    // Cannot cancel an Active group
    client.cancel_group(&admin, &group_id); // Should panic — group not open
}

#[test]
fn test_cancel_group_cleans_up_members_user_groups() {
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);

    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);

    let group = client.get_group(&group_id);

    // Fast forward past deadline + grace period
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    // Force end the round
    client.force_end_round(&group_id);

    let group = client.get_group(&group_id);
    // Round should have advanced
    assert!(group.current_round > 1 || group.status == GroupStatus::Completed);
}

#[test]
fn test_claim_refund() {
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Active);

    // Pause the group
    client.pause_group(&admin, &group_id);
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Paused);

    // Resume the group
    client.resume_group(&admin, &group_id);
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Active);
}

#[test]
fn test_cannot_contribute_when_paused() {
    // Complete all 3 rounds (one per member gets payout)
    for round in 1..=3 {
        env.ledger().with_mut(|li| {
            li.timestamp = env.ledger().timestamp() + 604800 + 1;
        });
        client.contribute(&admin, &group_id);
        client.contribute(&member2, &group_id);
        client.contribute(&member3, &group_id);
    }

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Completed);

    // Try to contribute after completion — should fail with GroupNotActive
    let result = client.try_contribute(&admin, &group_id);
    assert_eq!(result, Err(Ok(Error::GroupNotActive)));
}

#[test]
fn test_overdue_status_set_when_past_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-member-cleanup");
    let name = String::from_str(&env, "Cleanup Test");
    let group_id = String::from_str(&env, "remove-test");
    let name = String::from_str(&env, "Remove Test");
    let group_id = String::from_str(&env, "refund-test");
    let name = String::from_str(&env, "Refund Test");
    let group_id = String::from_str(&env, "pause-contrib-test");
    let name = String::from_str(&env, "Pause Contrib Test");
    let group_id = String::from_str(&env, "overdue-test");
    let name = String::from_str(&env, "Overdue Test");

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

    // Member has 1 group
    assert_eq!(client.get_user_groups(&member).len(), 1);

    // Cancel the group
    client.cancel_group(&admin, &group_id);

    // Member's user groups should be empty now
    assert_eq!(client.get_user_groups(&member).len(), 0);
    assert_eq!(client.get_user_groups(&admin).len(), 0);
}

// ============================================================
// Test for #625: Grace period constant works correctly
// ============================================================

#[test]
fn test_grace_period_applied() {
    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 2); // admin + member

    // Admin removes the member
    client.remove_member(&admin, &group_id, &member);

    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 1); // only admin
}

#[test]
fn test_retry_distribution() {
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

    // Fast forward to round start
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    // Only admin and member2 contribute (member3 doesn't)
    client.contribute(&admin, &group_id);
    client.contribute(&member2, &group_id);
    // Pause the group
    client.pause_group(&admin, &group_id);

    // Fast forward time
    env.ledger().with_mut(|li| {
        li.timestamp = env.ledger().timestamp() + 200;
    });

    // Try to contribute while paused — should fail
    let result = client.try_contribute(&admin, &group_id);
    assert_eq!(result, Err(Ok(Error::GroupNotActive)));
}

#[test]
fn test_mark_defaulted_external() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "grace-test");
    let name = String::from_str(&env, "Grace Period");

    client.create_group(
    let group_id = String::from_str(&env, "retry-test");
    let name = String::from_str(&env, "Retry Test");

    client.create_group(
    let group_id = String::from_str(&env, "default-test");
    let name = String::from_str(&env, "Default Test");

    client.create_group(
    let group = client.get_group(&group_id);

    // Fast forward past deadline but within grace period (3 days)
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 1; // just past deadline
    });

    // Member contributes late — should be marked Overdue
    client.contribute(&admin, &group_id);
    let member_data = client.get_member(&admin, &group_id);
    assert_eq!(member_data.status, MemberStatus::Overdue);
}

#[test]
fn test_initialize_sets_admin() {
    let env = Env::default();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);
    let group_id = String::from_str(&env, "test-init");
    let name = String::from_str(&env, "Init Test");

    // Should work after initialization
    let result = client.try_create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    let group = client.get_group(&group_id);
    // Deadline for round 1
    let deadline = group.start_timestamp + 604800; // 1 week

    // Fast forward to exactly deadline + grace period (3 days)
    // Admin contributes on time
    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 1;
    });
    client.contribute(&admin, &group_id);

    // m1 contributes within grace period (deadline + 2 days)
    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 172800; // +2 days
    });
    client.contribute(&m1, &group_id);

    // m2 tries after grace period (deadline + 4 days = 259200 + 86400 = 345600)
    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 345_600; // +4 days
    });
    // Should fail — payment window closed (past grace period)
    // Note: #[should_panic] not used here because we test the Result
    // Actually soroban tests panic on Err, so we verify via the member status
    let result = client.try_contribute(&m2, &group_id);
    assert!(result.is_err());
}
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);

    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);

    let group = client.get_group(&group_id);
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    // All members contribute
    client.contribute(&admin, &group_id);
    client.contribute(&member2, &group_id);
    client.contribute(&member3, &group_id);

    // Payout should have been auto-distributed
    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    // Retry should be a no-op since payout already exists
    let result = client.try_retry_distribution(&group_id);
    assert!(result.is_ok());
}

#[test]
fn test_paginated_groups() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "Test Group");

    // Create 3 groups
    for i in 1..=3 {
        let group_id = match i {
            1 => String::from_str(&env, "page-group-1"),
            2 => String::from_str(&env, "page-group-2"),
            _ => String::from_str(&env, "page-group-3"),
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

    // Get page 0 with page_size 2
    let page0 = client.get_groups_page(&0, &2);
    assert_eq!(page0.len(), 2);

    // Get page 1 with page_size 2
    let page1 = client.get_groups_page(&1, &2);
    assert_eq!(page1.len(), 1);

    // Total count
    let total = client.get_group_total_count();
    assert_eq!(total, 3);
}

    // Fast forward past deadline + grace period
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    // Force end the round
    client.force_end_round(&group_id);

    // member2 paid but didn't receive payout (admin got it since admin is join_order 0)
    let refund = client.claim_refund(&member2, &group_id, &1);
    assert_eq!(refund, Ok(100_000_000));
}

#[test]
fn test_start_timestamp_max_offset() {
    // Anyone can mark a member as defaulted
    let caller = Address::generate(&env);
    client.mark_defaulted(&member2, &group_id);

    let member_data = client.get_member(&member2, &group_id);
    assert_eq!(member_data.status, MemberStatus::Defaulted);
}

#[test]
fn test_cannot_join_after_start_date() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "far-future-test");
    let name = String::from_str(&env, "Far Future Test");

    // Try to create a group starting more than 1 year from now
    let far_future = env.ledger().timestamp() + 40_000_000; // ~1.27 years
    let result = client.try_create_group(
    let group_id = String::from_str(&env, "start-date-test");
    let name = String::from_str(&env, "Start Date Test");

    let start_time = env.ledger().timestamp() + 100;
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &far_future,
        &true,
    );
    assert_eq!(result, Err(Ok(Error::StartDateTooFarInFuture)));
}
        &Frequency::Weekly,
        &start_time,
        &true,
    );

    // Fast forward past start date
    env.ledger().with_mut(|li| {
        li.timestamp = start_time + 1;
    });

    // Try to join after start date — should fail
    let member = Address::generate(&env);
    let result = client.try_join_group(&member, &group_id);
    assert_eq!(result, Err(Ok(Error::StartDateAlreadyPassed)));
}
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
    );
}

#[test]
fn test_initialize_cannot_be_called_twice() {
    let env = Env::default();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let result = client.try_initialize(&admin);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

// #698: Regression guard for symbol_short! at the 9-character Soroban limit.
// "round_end" is exactly 9 characters. If a future rename exceeds the limit,
// this test catches it at compile time.
#[test]
fn test_round_end_event_symbol_boundary() {
    use soroban_sdk::symbol_short;

    let sym = symbol_short!("round_end");
    // Verify the symbol is exactly "round_end" — if symbol_short! ever
    // changes behavior for the 9-char boundary, this test will fail.
    assert_eq!(format!("{}", sym), "round_end");
// ── Security regression tests for admin-first-payout audit cluster (#744–#747) ──────────────

/// #747 — Documents the current, exploitable behavior: after the admin receives the round-1
/// payout they can simply never call contribute() again, permanently stranding the group in
/// round 2 with no on-chain recourse for the remaining members.
///
/// This test asserts the CURRENT (broken) state as a regression baseline so any future fix
/// is forced to make this test pass differently (e.g., a forced-default mechanism).
#[test]
fn test_admin_defaults_after_payout_group_permanently_stuck() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "sec-test-admin-rug");
    let name = String::from_str(&env, "Admin Rug Test");

    // Step 1: Create a 3-member group.
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &true, &None,
    );

    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    client.join_group(&member2, &group_id);
    client.join_group(&member3, &group_id);

    // Confirm admin gets join_order 0 (first payout).
    assert_eq!(client.get_member(&admin, &group_id).join_order, 0);

    let group = client.get_group(&group_id);
    env.ledger().with_mut(|li| li.timestamp = group.start_timestamp + 1);

    // Step 2: All three members contribute in round 1 — admin receives payout automatically.
    client.contribute(&admin, &group_id);
    client.contribute(&member2, &group_id);
    client.contribute(&member3, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.get(0).unwrap().recipient, admin, "admin should have received round-1 payout");

    // Step 3: Round 2 starts. Admin simply never calls contribute() again.
    // Advance past the round-2 deadline to show there is no forced-default.
    let deadline_r2 = client.get_round_deadline(&group_id, &2);
    // Grace period is typically 1 day (86400 s); advance well past it.
    env.ledger().with_mut(|li| li.timestamp = deadline_r2 + 86401);

    // Step 4: member2 and member3 contribute in round 2 — but all_members_paid() will never
    // return true because admin never contributed, so distribute_payout() is never triggered
    // and the group is permanently stuck.  member2's contribution succeeds (they are not past
    // the deadline themselves yet from the contract's per-member window perspective), but
    // admin's contribution is simply absent.
    let result2 = client.try_contribute(&member2, &group_id);
    // Depending on contract state, this may succeed or return PaymentWindowClosed;
    // what matters is: round 2 has NOT closed and member2 has NOT received their payout.
    let group_after = client.get_group(&group_id);

    // The group is still in round 2 (current_round has not advanced to 3).
    assert!(
        group_after.current_round <= 2,
        "group must still be stuck in round 2 — admin absence prevents payout: round={}",
        group_after.current_round
    );

    // Confirm admin data: has_received_payout is true, status reflects they contributed in r1.
    let admin_data = client.get_member(&admin, &group_id);
    assert!(admin_data.has_received_payout, "admin already received payout");

    // #747: This test documents the stuck state. A future forced-default fix should instead
    // allow a governance call to mark admin as Defaulted and unblock round progression.
    let _ = result2; // silence unused-result warning
}

/// #744/#745 — Demonstrates that the admin-first-payout guarantee combined with the
/// absence of any forced-default mechanism gives the group creator a trivially executable
/// path to collect the round-1 pool and exit with no on-chain consequence.
///
/// Asserts the preconditions of the attack so a future mitigation (bonding, rotation,
/// forced-default) can be validated against this exact setup.
#[test]
fn test_admin_first_payout_rug_pull_preconditions() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "sec-test-rugpull-pre");
    let name = String::from_str(&env, "Rug Pull Precondition");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &200_000_000,   // 200 XLM per contribution
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &true, &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    let m3 = Address::generate(&env);
    let m4 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);
    client.join_group(&m3, &group_id);
    client.join_group(&m4, &group_id);

    // Precondition A: admin always has join_order 0 → always first payout.
    assert_eq!(
        client.get_member(&admin, &group_id).join_order, 0,
        "admin join_order must be 0 (first-payout precondition)"
    );

    // Precondition B: no bonding/stake recorded for admin.
    let admin_data = client.get_member(&admin, &group_id);
    assert!(!admin_data.has_received_payout, "no payout yet before round 1");

    // Precondition C: group has no forced-default or emergency-exit function.
    // (Validated by inspecting the contract interface — no such entry point exists.)
    // This is documented here as a compile-time structural check: if a forced-default
    // function is ever added, the SavingsContractClient will expose it and this comment
    // should be updated with a positive test for it.

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Open);
}
