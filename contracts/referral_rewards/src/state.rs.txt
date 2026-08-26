use crate::{ReferralRewards, ReferralRewardsClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, String,
};

// ── Test fixtures & helpers ───────────────────────────────────────────────────

fn setup_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 1_700_000_000,
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

fn create_rewards(env: &Env) -> ReferralRewardsClient<'_> {
    let contract_id = env.register(ReferralRewards, ());
    ReferralRewardsClient::new(env, &contract_id)
}

/// Register a referral with helper defaults.
fn register_referral(
    env: &Env,
    client: &ReferralRewardsClient<'_>,
    referrer: &Address,
    referee: &Address,
    group_id: &str,
) {
    client.register_referral(referrer, referee, &String::from_str(env, group_id));
}

// ── Initialization ────────────────────────────────────────────────────────────

#[test]
fn test_initialize_sets_admin() {
    let env = setup_env();
    let client = create_rewards(&env);
    let admin = Address::generate(&env);

    client.initialize(&admin);
    // Verify by checking that set_reward_config succeeds for the admin.
    let treasury = Address::generate(&env);
    let asset = Address::generate(&env);
    let registry = Address::generate(&env);
    client.set_reward_config(&admin, &treasury, &asset, &100, &5, &registry);

    let config = client.get_reward_config().unwrap();
    assert_eq!(config.admin, admin);
    assert_eq!(config.treasury, treasury);
    assert_eq!(config.asset, asset);
    assert_eq!(config.amount, 100);
    assert_eq!(config.reputation_threshold, 5);
}

#[test]
#[should_panic(expected = "Error(Contract, #204)")]
fn test_cannot_initialize_twice() {
    let env = setup_env();
    let client = create_rewards(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1);
    client.initialize(&admin2); // must panic
}

#[test]
#[should_panic(expected = "Error(Contract, #204)")]
fn test_set_reward_config_rejects_non_admin() {
    let env = setup_env();
    let client = create_rewards(&env);
    let admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let treasury = Address::generate(&env);
    let asset = Address::generate(&env);
    let registry = Address::generate(&env);

    client.initialize(&admin);
    client.set_reward_config(&impostor, &treasury, &asset, &100, &5, &registry);
}

// ── Registration ──────────────────────────────────────────────────────────────

#[test]
fn test_register_referral_stores_all_fields() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    let referral = client.register_referral(
        &referrer,
        &referee,
        &String::from_str(&env, "group-1"),
    );

    assert_eq!(referral.referrer, referrer);
    assert_eq!(referral.referee, referee);
    assert_eq!(referral.group_id, String::from_str(&env, "group-1"));
    assert_eq!(referral.status, crate::ReferralStatus::Pending);
    assert!(referral.registered_at > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #200)")]
fn test_cannot_register_duplicate_referral() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    register_referral(&env, &client, &referrer, &referee, "group-1");
    register_referral(&env, &client, &referrer, &referee, "group-1"); // duplicate
}

#[test]
fn test_same_referrer_referee_different_groups_allowed() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    register_referral(&env, &client, &referrer, &referee, "group-1");
    register_referral(&env, &client, &referrer, &referee, "group-2");

    let referrals = client.get_referrer_referrals(&referrer);
    assert_eq!(referrals.len(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #206)")]
fn test_register_referral_rejects_empty_group_id() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    client.register_referral(&referrer, &referee, &String::from_str(&env, ""));
}

// ── Queries ───────────────────────────────────────────────────────────────────

#[test]
fn test_get_referral_returns_stored_record() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    let stored = client.register_referral(
        &referrer,
        &referee,
        &String::from_str(&env, "g-1"),
    );

    let fetched = client.get_referral(&referrer, &referee, &String::from_str(&env, "g-1"));
    assert_eq!(stored, fetched.unwrap());
}

#[test]
#[should_panic(expected = "Error(Contract, #201)")]
fn test_get_referral_not_found() {
    let env = setup_env();
    let client = create_rewards(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);

    client.get_referral(&referrer, &referee, &String::from_str(&env, "nonexistent"));
}

#[test]
fn test_get_referrer_referrals_empty_for_unknown() {
    let env = setup_env();
    let client = create_rewards(&env);
    let unknown = Address::generate(&env);

    let referrals = client.get_referrer_referrals(&unknown);
    assert_eq!(referrals.len(), 0);
}

#[test]
fn test_get_reward_config_not_set() {
    let env = setup_env();
    let client = create_rewards(&env);

    let result = client.try_get_reward_config();
    assert!(result.is_err());
}

// ── Integration / journey ─────────────────────────────────────────────────────

#[test]
fn test_complete_referral_journey() {
    let env = setup_env();
    let client = create_rewards(&env);
    let admin = Address::generate(&env);
    let referrer = Address::generate(&env);
    let referee = Address::generate(&env);
    let treasury = Address::generate(&env);
    let asset = Address::generate(&env);
    let registry = Address::generate(&env);

    // 1. Initialize and configure.
    client.initialize(&admin);
    client.set_reward_config(&admin, &treasury, &asset, &500, &3, &registry);

    let config = client.get_reward_config().unwrap();
    assert_eq!(config.amount, 500);
    assert_eq!(config.reputation_threshold, 3);

    // 2. Register a referral.
    let referral = client.register_referral(
        &referrer,
        &referee,
        &String::from_str(&env, "savings-group-1"),
    );
    assert_eq!(referral.status, crate::ReferralStatus::Pending);

    // 3. Verify the referral is indexed.
    let referrer_refs = client.get_referrer_referrals(&referrer);
    assert_eq!(referrer_refs.len(), 1);

    // Note: claim_reward testing would require mocking the cross-contract
    // call to the ReputationRegistry, which requires a mock contract
    // implementing the get_reputation trait. This is tested in the
    // cross-contract integration test suite.
}
