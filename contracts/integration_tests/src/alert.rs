//! End-to-end integration tests spanning the savings contract lifecycle (#865)
//!
//! Tests the full happy-path sequence from the README:
//!   create -> join -> contribute -> payout
//!
//! Plus failure-path tests for edge cases.

use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger},
    Address, Env, String,
};

use esustellar_savings::{
    Error, Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient,
};

// ── Helpers ──────────────────────────────────────────────────────────

fn setup() -> (Env, Address, SavingsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    (env, admin, client)
}

// ── Happy Path: Full Lifecycle ───────────────────────────────────────

#[test]
fn test_full_happy_path_create_join_contribute_payout() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "integration-happy");
    let name = String::from_str(&env, "Integration Test Group");

    // Step 1: Create group
    let group = client.create_group(
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
    assert_eq!(group.status, GroupStatus::Open);
    assert_eq!(group.total_members, 3);
    assert_eq!(group.current_round, 0);

    // Step 2: Join group (admin is first member)
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    // Group should now be Active
    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);

    // Verify all 3 members
    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 3);

    // Step 3: All members contribute
    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    // Verify contributions recorded
    let contributions = client.get_round_contributions(&group_id, &1);
    assert_eq!(contributions.len(), 3);

    // Step 4: Payout should have been triggered
    // After all contribute, one member receives the pool
    let payouts = client.get_round_payouts(&group_id, &1);
    assert_eq!(payouts.len(), 1);

    // Verify the payout recipient got the pooled amount (minus 2% fee)
    let payout = payouts.get(0).unwrap();
    let expected_pool = 100_000_000_i128 * 3; // 3 members * 100M stroops
    let expected_fee = expected_pool * 2 / 100; // 2% platform fee
    let expected_payout = expected_pool - expected_fee;
    assert_eq!(payout.amount, expected_payout);
}

// ── Failure Path: Contribute After Group Full ─────────────────────────

#[test]
fn test_cannot_contribute_to_open_group() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "integration-open");
    let name = String::from_str(&env, "Open Group");

    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &None,
    );

    // Try to contribute to Open group — should fail
    let result = client.try_contribute(&admin, &group_id);
    assert!(result.is_err());
}

// ── Failure Path: Join After Active ──────────────────────────────────

#[test]
fn test_cannot_join_active_group() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "integration-active-join");
    let name = String::from_str(&env, "Active Join Group");

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

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    // Group is now Active, new member should fail
    let late = Address::generate(&env);
    let result = client.try_join_group(&late, &group_id);
    assert!(result.is_err());
}

// ── Failure Path: Double Contribute ──────────────────────────────────

#[test]
fn test_cannot_contribute_twice_same_round() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "integration-double");
    let name = String::from_str(&env, "Double Contrib Group");

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

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    client.contribute(&admin, &group_id);
    let result = client.try_contribute(&admin, &group_id);
    assert!(result.is_err());
}

// ── Multiple Rounds ──────────────────────────────────────────────────

#[test]
fn test_multiple_rounds() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "integration-rounds");
    let name = String::from_str(&env, "Multi Round Group");

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

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    // Round 1: all contribute
    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.current_round, 2); // Should advance to round 2

    // Round 2: all contribute
    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.current_round, 3); // Should advance to round 3
}
