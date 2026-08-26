use crate::{
    Error, Frequency, GroupStatus, MemberStatus, SavingsContract, SavingsContractClient,
    DEFAULT_PLATFORM_FEE_BPS,
};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events, Ledger},
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

fn setup_full_group(
    env: &Env,
) -> (
    Address,
    Address,
    Address,
    Address,
    SavingsContractClient<'_>,
    String,
) {
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

// ─── Tests for FeeCollected Event ──────────────────────────────────────────

#[test]
fn test_fee_collected_event_emitted_on_payout() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let treasury = Address::generate(&env);
    let group_id = String::from_str(&env, "fee-audit-group");
    let name = String::from_str(&env, "Fee Audit Group");
    let contribution_amount = 100_000_000i128; // 10 XLM
    let total_members = 3u32;

    client.create_group(
        &admin,
        &group_id,
        &name,
        &contribution_amount,
        &total_members,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &treasury,
        &None,
    );

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    client.join_group(&m1, &group_id);
    client.join_group(&m2, &group_id);

    // Fast-forward past start timestamp
    env.ledger().with_mut(|li| {
        li.timestamp = 100_101;
    });

    // All members contribute for round 1
    client.contribute(&admin, &group_id);
    client.contribute(&m1, &group_id);
    client.contribute(&m2, &group_id);

    // Calculation:
    // Total pool = 100_000_000 * 3 = 300_000_000
    // Platform fee (200 bps = 2%) = 300_000_000 * 200 / 10000 = 6_000_000
    // Payout amount = 300_000_000 - 6_000_000 = 294_000_000
    let total_pool = contribution_amount * (total_members as i128);
    let expected_fee = (total_pool * (DEFAULT_PLATFORM_FEE_BPS as i128)) / 10000;
    assert_eq!(expected_fee, 6_000_000i128);

    // Verify events were emitted
    let events = env.events().all();
    let mut found_payout_event = false;
    let mut found_fee_event = false;

    for event in events.iter() {
        // Check for payout event
        if event.1.get(0) == Some(symbol_short!("payout").into()) {
            found_payout_event = true;
        }
        // Check for fee_col event
        if event.1.get(0) == Some(symbol_short!("fee_col").into()) {
            found_fee_event = true;
        }
    }

    assert!(found_payout_event, "Payout event must be published");
    assert!(
        found_fee_event,
        "FeeCollected (fee_col) event must be published for on-chain auditability"
    );
}

// ─── Tests for Group ID Normalization ──────────────────────────────────────

#[test]
fn test_group_id_normalization_trims_and_lowercases() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    // Raw input has mixed case and surrounding whitespace
    let raw_group_id = String::from_str(&env, "   MySavingsGroup-2026   ");
    let name = String::from_str(&env, "Normalized Group");

    let group = client.create_group(
        &admin,
        &raw_group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &None,
    );

    // Stored group_id must be trimmed and lowercase
    let expected_canonical_id = String::from_str(&env, "mysavingsgroup-2026");
    assert_eq!(group.group_id, expected_canonical_id);

    // Lookup using canonical ID succeeds
    let fetched = client.get_group(&expected_canonical_id);
    assert_eq!(fetched.group_id, expected_canonical_id);

    // Lookup using uppercase or padded string also normalizes and succeeds
    let uppercase_lookup = String::from_str(&env, "MYSAVINGSGROUP-2026");
    let fetched_upper = client.get_group(&uppercase_lookup);
    assert_eq!(fetched_upper.group_id, expected_canonical_id);

    let padded_lookup = String::from_str(&env, "  mysavingsgroup-2026  ");
    let fetched_padded = client.get_group(&padded_lookup);
    assert_eq!(fetched_padded.group_id, expected_canonical_id);
}

#[test]
fn test_group_id_collision_prevention() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let id_v1 = String::from_str(&env, "UniqueGroup");
    let name = String::from_str(&env, "Group One");

    client.create_group(
        &admin,
        &id_v1,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &None,
    );

    // Advance time to allow next group creation past rate limit
    env.ledger().with_mut(|li| {
        li.timestamp += 86401;
    });

    let admin2 = Address::generate(&env);
    // Trying to create with visually similar "uniquegroup" or "  UniqueGroup  " must fail
    let id_v2 = String::from_str(&env, "  uniquegroup  ");
    let result = client.try_create_group(
        &admin2,
        &id_v2,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin2,
        &None,
    );

    assert_eq!(result, Err(Ok(Error::GroupIdAlreadyExists)));
}

#[test]
fn test_empty_or_whitespace_group_id_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let name = String::from_str(&env, "Group");

    // Empty ID
    let empty_id = String::from_str(&env, "");
    let res_empty = client.try_create_group(
        &admin,
        &empty_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &None,
    );
    assert_eq!(res_empty, Err(Ok(Error::InvalidGroupId)));

    // Whitespace-only ID
    let whitespace_id = String::from_str(&env, "     ");
    let res_ws = client.try_create_group(
        &admin,
        &whitespace_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
        &admin,
        &None,
    );
    assert_eq!(res_ws, Err(Ok(Error::InvalidGroupId)));
}

#[test]
fn test_join_group_with_unnormalized_id() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "AlphaBeta");
    let name = String::from_str(&env, "Alpha Beta");

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
    // Member joins using all lowercase or padded ID
    let join_id = String::from_str(&env, "  alphabeta  ");
    let res = client.try_join_group(&m1, &join_id);
    assert!(res.is_ok(), "Joining with unnormalized group ID must succeed");

    let members = client.get_members(&String::from_str(&env, "alphabeta"));
    assert_eq!(members.len(), 2);
}
