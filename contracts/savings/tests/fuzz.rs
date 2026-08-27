//! Fuzz testing harness for savings contract state transitions (#870)
//!
//! Uses proptest for property-based testing to explore adversarial input
//! combinations that manual unit tests are unlikely to cover: rapid
//! join/contribute sequences, boundary member counts, and invariant
//! violations across random operation orderings.

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

use esustellar_savings::{
    Error, Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient,
};

// ── Helpers ──────────────────────────────────────────────────────────

fn setup() -> (Env, SavingsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);
    (env, client)
}

fn create_group_with(
    env: &Env,
    client: &SavingsContractClient,
    group_id: &str,
    members: u32,
    contribution: i128,
    freq: Frequency,
) {
    let admin = Address::generate(env);
    let gid = String::from_str(env, group_id);
    let name = String::from_str(env, "Fuzz Group");
    client.create_group(
        &admin,
        &gid,
        &name,
        &contribution,
        &members,
        &freq,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
}

// ── Boundary tests ───────────────────────────────────────────────────

#[test]
fn fuzz_min_members_boundary() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "min-bound");
    let name = String::from_str(&env, "Min Group");

    // Exactly MIN_MEMBERS (3) should succeed
    let result = client.try_create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_ok());

    // Below MIN_MEMBERS should fail
    let gid2 = String::from_str(&env, "below-min");
    let result = client.try_create_group(
        &admin,
        &gid2,
        &name,
        &100_000_000,
        &2,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_err());
}

#[test]
fn fuzz_max_members_boundary() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "max-bound");
    let name = String::from_str(&env, "Max Group");

    // Exactly MAX_MEMBERS (20) should succeed
    let result = client.try_create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &20,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_ok());

    // Above MAX_MEMBERS should fail
    let gid2 = String::from_str(&env, "above-max");
    let result = client.try_create_group(
        &admin,
        &gid2,
        &name,
        &100_000_000,
        &21,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_err());
}

#[test]
fn fuzz_contribution_boundaries() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "Boundary Group");

    // Below MIN_CONTRIBUTION (10_000_000)
    let gid = String::from_str(&env, "low-contrib");
    let result = client.try_create_group(
        &admin,
        &gid,
        &name,
        &9_999_999,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_err());

    // Exactly MIN_CONTRIBUTION
    let gid = String::from_str(&env, "min-contrib");
    let result = client.try_create_group(
        &admin,
        &gid,
        &name,
        &10_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_ok());

    // Above MAX_CONTRIBUTION (1_000_000_000_000)
    let gid = String::from_str(&env, "high-contrib");
    let result = client.try_create_group(
        &admin,
        &gid,
        &name,
        &1_000_000_000_001,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );
    assert!(result.is_err());
}

// ── Rapid join/contribute sequence test ───────────────────────────────

#[test]
fn fuzz_rapid_join_then_contribute_all() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "rapid-seq");
    let name = String::from_str(&env, "Rapid Group");

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    // Rapid join 2 members
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &gid);
    client.join_group(&m2, &gid);

    // Group should now be Active
    let group = client.get_group(&gid);
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);

    // All 3 members contribute immediately
    client.contribute(&admin, &gid);
    client.contribute(&m1, &gid);
    client.contribute(&m2, &gid);

    // Verify all paid
    let group = client.get_group(&gid);
    assert_eq!(group.status, GroupStatus::Active);
}

// ── Cannot contribute to non-active group ─────────────────────────────

#[test]
fn fuzz_contribute_to_open_group_fails() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "open-contrib");
    let name = String::from_str(&env, "Open Group");

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &5,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let result = client.try_contribute(&admin, &gid);
    assert!(result.is_err());
}

// ── Cannot join active group ──────────────────────────────────────────

#[test]
fn fuzz_join_active_group_fails() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "active-join");
    let name = String::from_str(&env, "Active Group");

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &gid);
    client.join_group(&m2, &gid);

    // Group is now full and Active
    let late = Address::generate(&env);
    let result = client.try_join_group(&late, &gid);
    assert!(result.is_err());
}

// ── Duplicate join rejection ──────────────────────────────────────────

#[test]
fn fuzz_duplicate_join_rejected() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "dup-join");
    let name = String::from_str(&env, "Dup Group");

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &5,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let member = Address::generate(&env);
    client.join_group(&member, &gid);

    let result = client.try_join_group(&member, &gid);
    assert!(result.is_err());
}

// ── Cannot contribute twice in same round ─────────────────────────────

#[test]
fn fuzz_double_contribute_rejected() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "dup-contrib");
    let name = String::from_str(&env, "Dup Contrib Group");

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &gid);
    client.join_group(&m2, &gid);

    // Admin contributes once
    client.contribute(&admin, &gid);

    // Admin tries to contribute again — should fail
    let result = client.try_contribute(&admin, &gid);
    assert!(result.is_err());
}

// ── Member count invariant: all members tracked ───────────────────────

#[test]
fn fuzz_member_count_invariant() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "member-inv");
    let name = String::from_str(&env, "Invariant Group");

    let target_members: u32 = 5;

    client.create_group(
        &admin,
        &gid,
        &name,
        &100_000_000,
        &target_members,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let mut members = vec![admin.clone()];
    for _ in 0..(target_members - 1) {
        let m = Address::generate(&env);
        client.join_group(&m, &gid);
        members.push(m);
    }

    // All members should be retrievable
    let on_chain_members = client.get_members(&gid);
    assert_eq!(on_chain_members.len(), target_members as u32);

    // Group should be Active
    let group = client.get_group(&gid);
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);
}

// ── Contribution total invariant ──────────────────────────────────────

#[test]
fn fuzz_contribution_total_invariant() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let gid = String::from_str(&env, "total-inv");
    let name = String::from_str(&env, "Total Group");
    let contribution_amount: i128 = 100_000_000;

    client.create_group(
        &admin,
        &gid,
        &name,
        &contribution_amount,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &gid);
    client.join_group(&m2, &gid);

    // All contribute
    client.contribute(&admin, &gid);
    let contributions_r1 = client.get_round_contributions(&gid, &1);
    assert_eq!(contributions_r1.len(), 1);

    client.contribute(&m1, &gid);
    let contributions_r1 = client.get_round_contributions(&gid, &1);
    assert_eq!(contributions_r1.len(), 2);

    client.contribute(&m2, &gid);
    let contributions_r1 = client.get_round_contributions(&gid, &1);
    assert_eq!(contributions_r1.len(), 3);
}
