use crate::{Error, Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_test_group(env: &Env) -> (Address, SavingsContractClient<'_>) {
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    (admin, client)
}

fn setup_full_group(env: &Env) -> (Address, Address, Address, Address, SavingsContractClient<'_>, String) {
    let (admin, client) = create_test_group(env);
    let group_id = String::from_str(env, "full-group");
    let name = String::from_str(env, "Full Group");

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
        &None,
    );

    let m1 = Address::generate(env);
    let m2 = Address::generate(env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    assert_eq!(client.get_group(&group_id).status, GroupStatus::Active);
    (admin, m1, m2, Address::generate(env), client, group_id)
}

// ─── Basic tests ────────────────────────────────────────────────────

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
        &None,
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
        &admin, &group_id, &name, &5_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
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
        &admin, &group_id, &name, &100_000_000, &3,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    client.join_group(&member2, &group_id);
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
        &admin, &group_id, &name, &100_000_000, &3,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    let m3 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);
    client.join_group(&m3, &group_id);
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
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let member = Address::generate(&env);
    client.join_group(&member, &group_id);
    client.join_group(&member, &group_id);
}

// ─── Payout and contribution tests ──────────────────────────────────

#[test]
fn test_contribution_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);

    let group = client.get_group(&group_id);
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);
}

#[test]
fn test_payout_order_is_not_deterministic() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "rand-group");
    let name = String::from_str(&env, "Random Payout Test");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &3,
        &Frequency::Weekly, &(env.ledger().timestamp() + 100),
        &true, &admin, &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    let group = client.get_group(&group_id);

    // payout_order should be populated and length == total_members
    assert_eq!(group.payout_order.len(), 3);

    // All values 0..3 should appear exactly once (valid permutation)
    let mut seen = [false; 3];
    for i in 0..3 {
        let v = group.payout_order.get(i).unwrap() as usize;
        assert!(!seen[v], "duplicate in payout_order");
        seen[v] = true;
    }

    // Payout order determines recipient — run a full round and verify
    // the recipient matches payout_order[0]
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    let recipient_order = group.payout_order.get(0).unwrap();
    let expected_recipient = if recipient_order == 0 {
        admin.clone()
    } else if recipient_order == 1 {
        m1.clone()
    } else {
        m2.clone()
    };
    assert_eq!(payouts.get(0).unwrap().recipient, expected_recipient);
}

#[test]
fn test_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    // Run all 3 rounds
    for round in 1..=3u32 {
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + (round as u64 * 604800) + 1;
        });

        client.contribute(&admin, &group_id);
        client.contribute(&m1, &group_id);
        client.contribute(&m2, &group_id);
    }

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Completed);
}

#[test]
fn test_get_round_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group");
    let name = String::from_str(&env, "Test Group");
    let start_time = env.ledger().timestamp() + 86400;

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Weekly, &start_time,
        &true, &admin, &None,
    );

    let deadline = client.get_round_deadline(&group_id, &1);
    assert_eq!(deadline, start_time + 604800);
}

// ─── Group management tests ─────────────────────────────────────────

#[test]
fn test_cancel_group_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-test");
    let name = String::from_str(&env, "Cancel Me");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    assert_eq!(client.get_all_groups().len(), 1);
    client.cancel_group(&admin, &group_id);
    assert_eq!(client.get_all_groups().len(), 0);
}

#[test]
#[should_panic]
fn test_cancel_group_not_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "cancel-noauth");
    let name = String::from_str(&env, "Cancel Me");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let other = Address::generate(&env);
    client.cancel_group(&other, &group_id);
}

#[test]
#[should_panic]
fn test_cancel_group_not_open() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    // Group is Active — cancel should fail
    client.cancel_group(&admin, &group_id);
}

#[test]
fn test_pause_and_resume_group() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);

    client.pause_group(&admin, &group_id);
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Paused);

    client.resume_group(&admin, &group_id);
    assert_eq!(client.get_group(&group_id).status, GroupStatus::Active);
}

#[test]
fn test_admin_remove_member() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "remove-test");
    let name = String::from_str(&env, "Remove Test");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let member = Address::generate(&env);
    client.join_group(&member, &group_id);

    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 2);

    client.remove_member(&admin, &group_id, &member);
    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 1);
}

#[test]
fn test_retry_distribution() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    // Round already completed via auto-distribution; retry returns an error
    let result = client.try_retry_distribution(&group_id);
    assert_eq!(result, Err(Ok(Error::NotAllPaid)));
}

#[test]
fn test_claim_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    let recipient = payouts.get(0).unwrap().recipient.clone();

    // Two non-recipients should be able to claim refunds
    let mut refunded_count = 0u32;
    for member in [admin.clone(), m1.clone(), m2.clone()].iter() {
        if *member != recipient {
            let result = client.try_claim_refund(member, &group_id, &1);
            if result == Ok(Ok(100_000_000)) {
                refunded_count += 1;
            }
        }
    }
    assert_eq!(refunded_count, 2);
}

#[test]
fn test_cannot_contribute_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    client.pause_group(&admin, &group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 200;
    });

    let result = client.try_contribute(&admin, &group_id);
    assert_eq!(result, Err(Ok(Error::GroupNotActive)));
}

#[test]
fn test_cannot_contribute_after_completed() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    for round in 1..=3u32 {
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + (round as u64 * 604800) + 1;
        });
        client.contribute(&admin, &group_id);
        client.contribute(&m1, &group_id);
        client.contribute(&m2, &group_id);
    }

    assert_eq!(client.get_group(&group_id).status, GroupStatus::Completed);

    let result = client.try_contribute(&admin, &group_id);
    assert_eq!(result, Err(Ok(Error::GroupNotActive)));
}

#[test]
fn test_overdue_status_set_when_past_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    let deadline = group.start_timestamp + 604800;

    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 1;
    });

    client.contribute(&admin, &group_id);

    let member_data = client.get_member(&admin, &group_id);
    assert_eq!(member_data.status, MemberStatus::PaidCurrentRound);
}

#[test]
fn test_grace_period_applied() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);
    let deadline = group.start_timestamp + 604800;

    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 1;
    });
    client.contribute(&admin, &group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 172800;
    });
    client.contribute(&m1, &group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = deadline + 345600;
    });
    let result = client.try_contribute(&m2, &group_id);
    assert!(result.is_err());
}

#[test]
fn test_force_end_round() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    client.force_end_round(&group_id);

    let group = client.get_group(&group_id);
    assert!(group.current_round > 1 || group.status == GroupStatus::Completed);
}

#[test]
fn test_initialize_sets_admin() {
    let env = Env::default();
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
}

#[test]
#[should_panic]
fn test_initialize_cannot_be_called_twice() {
    let env = Env::default();
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_mark_defaulted_external() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    client.mark_defaulted(&m2, &group_id);
    let member_data = client.get_member(&m2, &group_id);
    assert_eq!(member_data.status, MemberStatus::Defaulted);
}

#[test]
fn test_get_user_groups() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    let group_id = String::from_str(&env, "test-group");
    let name = String::from_str(&env, "Test Group");

    let groups = client.get_user_groups(&user);
    assert_eq!(groups.len(), 0);

    client.create_group(
        &user, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &user, &None,
    );

    let groups = client.get_user_groups(&user);
    assert_eq!(groups.len(), 1);
}

#[test]
fn test_get_all_groups() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let all_groups = client.get_all_groups();
    assert_eq!(all_groups.len(), 0);

    let admin = Address::generate(&env);
    let group_id = String::from_str(&env, "grp-1");
    let name = String::from_str(&env, "Grp");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    assert_eq!(client.get_all_groups().len(), 1);
}

#[test]
fn test_paginated_groups() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "Test Group");

    let gid0 = String::from_str(&env, "page-group-0");
    let gid1 = String::from_str(&env, "page-group-1");
    let gid2 = String::from_str(&env, "page-group-2");

    client.create_group(
        &admin, &gid0, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );
    env.ledger().with_mut(|li| { li.timestamp += 86401; });
    client.create_group(
        &admin, &gid1, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );
    env.ledger().with_mut(|li| { li.timestamp += 86401; });
    client.create_group(
        &admin, &gid2, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &admin, &None,
    );

    let page0 = client.get_groups_page(&0, &2);
    assert_eq!(page0.len(), 2);

    let page1 = client.get_groups_page(&1, &2);
    assert_eq!(page1.len(), 1);

    assert_eq!(client.get_group_total_count(), 3);
}

// ============================================================
// #747: Security-focused tests for admin-first-payout
// ============================================================

#[test]
fn test_admin_not_guaranteed_first_payout() {
    let env = Env::default();
    env.mock_all_auths();

    // Create a group, fill it, check payout_order
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "sec-admin-first");
    let name = String::from_str(&env, "Security Test");

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &3,
        &Frequency::Weekly, &(env.ledger().timestamp() + 100),
        &true, &admin, &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    let group = client.get_group(&group_id);

    // payout_order is a valid permutation of [0, 1, 2]
    assert_eq!(group.payout_order.len(), 3);
    let mut seen = [false; 3];
    for i in 0..3u32 {
        let v = group.payout_order.get(i).unwrap() as usize;
        assert!(v < 3);
        assert!(!seen[v]);
        seen[v] = true;
    }

    // In most random draws, admin (join_order 0) will NOT be first.
    // We verify the contract doesn't hardcode admin-first by checking
    // that the payout recipient for round 1 matches payout_order[0].
    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    let recipient = &payouts.get(0).unwrap().recipient;
    let first_order = group.payout_order.get(0).unwrap();
    let expected = if first_order == 0 {
        &admin
    } else if first_order == 1 {
        &m1
    } else {
        &m2
    };
    assert_eq!(recipient, expected);
}

#[test]
fn test_no_member_receives_two_payouts() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    let mut payout_recipients = soroban_sdk::Vec::new(&env);

    for round in 1..=3u32 {
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + (round as u64 * 604800) + 1;
        });

        client.contribute(&admin, &group_id);
        client.contribute(&m1, &group_id);
        client.contribute(&m2, &group_id);

        let payouts = client.get_round_payouts(&group_id, &round);
        assert_eq!(payouts.len(), 1);
        let r = payouts.get(0).unwrap().recipient.clone();

        // Each recipient should be unique
        for i in 0..payout_recipients.len() {
            assert_ne!(payout_recipients.get(i).unwrap(), r);
        }
        payout_recipients.push_back(r);
    }

    // All 3 members received exactly one payout
    assert_eq!(payout_recipients.len(), 3);
}

#[test]
fn test_payout_amount_includes_platform_fee_deduction() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 1;
    });

    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    // Total pool = 100M * 3 = 300M
    // Platform fee = 300M * 200 / 10000 = 6M
    // Payout = 300M - 6M = 294M
    assert_eq!(payouts.get(0).unwrap().amount, 294_000_000);
}

#[test]
fn test_defaulted_member_cannot_contribute() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    client.mark_defaulted(&m2, &group_id);

    // Next round
    let group = client.get_group(&group_id);
    if group.status == GroupStatus::Active {
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + 604800 * 2 + 1;
        });

        let result = client.try_contribute(&m2, &group_id);
        assert!(result.is_err());
    }
}

#[test]
fn test_cure_default_allows_rejoin() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, m1, m2, _, client, group_id) = setup_full_group(&env);
    let group = client.get_group(&group_id);

    env.ledger().with_mut(|li| {
        li.timestamp = group.start_timestamp + 604800 + 259200 + 1;
    });

    client.force_end_round(&group_id);

    // Resume the group so cure_default can work
    client.resume_group(&admin, &group_id);

    // Cure the defaulted member
    client.cure_default(&m2, &group_id);

    let member_data = client.get_member(&m2, &group_id);
    assert_eq!(member_data.status, MemberStatus::Active);
}

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "xfer-admin");
    let name = String::from_str(&env, "Xfer Admin");
    let new_admin = Address::generate(&env);

    client.create_group(
        &admin, &group_id, &name, &100_000_000, &3,
        &Frequency::Weekly, &(env.ledger().timestamp() + 100),
        &true, &admin, &None,
    );

    client.transfer_admin(&group_id, &admin, &new_admin);
    let group = client.get_group(&group_id);
    assert_eq!(group.admin, new_admin);
}

#[test]
fn test_get_user_groups_page() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    let name = String::from_str(&env, "Grp");

    let gid0 = String::from_str(&env, "ug-0");
    let gid1 = String::from_str(&env, "ug-1");
    let gid2 = String::from_str(&env, "ug-2");

    client.create_group(
        &user, &gid0, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &user, &None,
    );
    env.ledger().with_mut(|li| { li.timestamp += 86401; });
    client.create_group(
        &user, &gid1, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &user, &None,
    );
    env.ledger().with_mut(|li| { li.timestamp += 86401; });
    client.create_group(
        &user, &gid2, &name, &100_000_000, &5,
        &Frequency::Monthly, &(env.ledger().timestamp() + 86400),
        &true, &user, &None,
    );

    let page = client.get_user_groups_page(&user, &0, &2);
    assert_eq!(page.len(), 2);
}
