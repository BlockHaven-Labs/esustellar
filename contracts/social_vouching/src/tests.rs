use crate::{SocialVouching, SocialVouchingClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, SocialVouchingClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SocialVouching, ());
    let client = SocialVouchingClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client)
}

#[test]
fn test_vouch() {
    let (env, client) = setup();
    let voucher = Address::generate(&env);
    let subject = Address::generate(&env);

    let count = client.vouch(&voucher, &subject);
    assert_eq!(count, 1);
    assert!(client.has_vouched(&voucher, &subject));
}

#[test]
fn test_cannot_vouch_for_self() {
    let (env, client) = setup();
    let addr = Address::generate(&env);

    let result = client.try_vouch(&addr, &addr);
    assert!(result.is_err());
}

#[test]
fn test_cannot_vouch_twice() {
    let (env, client) = setup();
    let voucher = Address::generate(&env);
    let subject = Address::generate(&env);

    client.vouch(&voucher, &subject);
    let result = client.try_vouch(&voucher, &subject);
    assert!(result.is_err());
}

#[test]
fn test_revoke_vouch() {
    let (env, client) = setup();
    let voucher = Address::generate(&env);
    let subject = Address::generate(&env);

    client.vouch(&voucher, &subject);
    assert!(client.has_vouched(&voucher, &subject));

    let count = client.revoke_vouch(&voucher, &subject);
    assert_eq!(count, 0);
    assert!(!client.has_vouched(&voucher, &subject));
}

#[test]
fn test_revoke_nonexistent_fails() {
    let (env, client) = setup();
    let voucher = Address::generate(&env);
    let subject = Address::generate(&env);

    let result = client.try_revoke_vouch(&voucher, &subject);
    assert!(result.is_err());
}

#[test]
fn test_vouch_count() {
    let (env, client) = setup();
    let subject = Address::generate(&env);

    assert_eq!(client.vouch_count(&subject), 0);

    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);
    client.vouch(&v1, &subject);
    client.vouch(&v2, &subject);

    assert_eq!(client.vouch_count(&subject), 2);
}

#[test]
fn test_permissionless() {
    let (env, client) = setup();
    // Anyone can vouch — no admin gating
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);
    let subject = Address::generate(&env);

    client.vouch(&v1, &subject);
    client.vouch(&v2, &subject);

    assert_eq!(client.vouch_count(&subject), 2);
    assert!(client.has_vouched(&v1, &subject));
    assert!(client.has_vouched(&v2, &subject));
}

#[test]
fn test_vouch_count_decrements_on_revoke() {
    let (env, client) = setup();
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);
    let subject = Address::generate(&env);

    client.vouch(&v1, &subject);
    client.vouch(&v2, &subject);
    assert_eq!(client.vouch_count(&subject), 2);

    client.revoke_vouch(&v1, &subject);
    assert_eq!(client.vouch_count(&subject), 1);
}
