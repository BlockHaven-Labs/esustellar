use crate::{LatePaymentPenalty, LatePaymentPenaltyClient};
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};

fn setup() -> (Env, Address, LatePaymentPenaltyClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(LatePaymentPenalty, ());
    let client = LatePaymentPenaltyClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_set_penalty_policy() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");

    // 3-day grace, 5% penalty
    let policy = client.set_penalty_policy(&admin, &group_id, &259_200, &500);
    assert_eq!(policy.grace_period, 259_200);
    assert_eq!(policy.penalty_percent, 500);
}

#[test]
fn test_set_policy_admin_only() {
    let (env, _, client) = setup();
    let non_admin = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    let result = client.try_set_penalty_policy(&non_admin, &group_id, &259_200, &500);
    assert!(result.is_err());
}

#[test]
fn test_apply_penalty_on_time() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let member = Address::generate(&env);

    client.set_penalty_policy(&admin, &group_id, &259_200, &500);

    let deadline = 200_000u64;
    let amount = 100_000_000i128;

    env.ledger().with_mut(|li| { li.timestamp = 150_000; });
    let net = client.apply_penalty(&group_id, &member, &amount, &deadline);
    assert_eq!(net, amount);
}

#[test]
fn test_apply_penalty_within_grace() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let member = Address::generate(&env);

    client.set_penalty_policy(&admin, &group_id, &259_200, &500);

    let deadline = 200_000u64;
    let amount = 100_000_000i128;

    env.ledger().with_mut(|li| { li.timestamp = 250_000; });
    let net = client.apply_penalty(&group_id, &member, &amount, &deadline);
    assert_eq!(net, amount);
}

#[test]
fn test_apply_penalty_past_grace() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let member = Address::generate(&env);

    client.set_penalty_policy(&admin, &group_id, &259_200, &500);

    let deadline = 200_000u64;
    let amount = 100_000_000i128;

    env.ledger().with_mut(|li| { li.timestamp = 500_000; });
    let net = client.apply_penalty(&group_id, &member, &amount, &deadline);

    let expected_penalty = 5_000_000i128;
    assert_eq!(net, amount - expected_penalty);
}

#[test]
fn test_penalty_pool_balance() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let member = Address::generate(&env);

    client.set_penalty_policy(&admin, &group_id, &259_200, &500);

    let deadline = 200_000u64;
    let amount = 100_000_000i128;

    assert_eq!(client.penalty_pool_balance(&group_id), 0);

    env.ledger().with_mut(|li| { li.timestamp = 500_000; });
    client.apply_penalty(&group_id, &member, &amount, &deadline);

    assert_eq!(client.penalty_pool_balance(&group_id), 5_000_000);
}

#[test]
fn test_get_policy() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");

    client.set_penalty_policy(&admin, &group_id, &86400, &1000);

    let policy = client.get_policy(&group_id);
    assert_eq!(policy.grace_period, 86400);
    assert_eq!(policy.penalty_percent, 1000);
}

#[test]
fn test_invalid_penalty_percent() {
    let (env, admin, client) = setup();
    let group_id = String::from_str(&env, "group-1");

    let result = client.try_set_penalty_policy(&admin, &group_id, &259_200, &6000);
    assert!(result.is_err());
}
