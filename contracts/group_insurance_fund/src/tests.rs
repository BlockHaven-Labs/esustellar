use crate::{ClaimStatus, Error, GroupInsuranceFund, GroupInsuranceFundClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, Address, GroupInsuranceFundClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(GroupInsuranceFund, ());
    let client = GroupInsuranceFundClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_contribute_to_fund() {
    let (env, _, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let asset = String::from_str(&env, "XLM");

    let balance = client.contribute_to_fund(&group_id, &asset, &1_000_000);
    assert_eq!(balance, 1_000_000);

    let balance = client.contribute_to_fund(&group_id, &asset, &500_000);
    assert_eq!(balance, 1_500_000);
}

#[test]
fn test_contribute_zero_fails() {
    let (env, _, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let asset = String::from_str(&env, "XLM");

    let result = client.try_contribute_to_fund(&group_id, &asset, &0);
    assert!(result.is_err());
}

#[test]
fn test_file_claim() {
    let (env, _, client) = setup();
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "insufficient collateral");

    let claim_id = client.file_claim(&filed_by, &group_id, &100_000, &reason);
    assert_eq!(claim_id, 1);

    let claim = client.get_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Pending);
    assert_eq!(claim.amount, 100_000);
}

#[test]
fn test_approve_claim() {
    let (env, admin, client) = setup();
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "test reason");

    let claim_id = client.file_claim(&filed_by, &group_id, &100_000, &reason);
    client.approve_claim(&admin, &claim_id);

    let claim = client.get_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Approved);
    assert!(claim.reviewed_by.is_some());
}

#[test]
fn test_reject_claim() {
    let (env, admin, client) = setup();
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "test reason");

    let claim_id = client.file_claim(&filed_by, &group_id, &100_000, &reason);
    client.reject_claim(&admin, &claim_id);

    let claim = client.get_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Rejected);
}

#[test]
fn test_cannot_approve_twice() {
    let (env, admin, client) = setup();
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "test reason");

    let claim_id = client.file_claim(&filed_by, &group_id, &100_000, &reason);
    client.approve_claim(&admin, &claim_id);

    let result = client.try_approve_claim(&admin, &claim_id);
    assert!(result.is_err());
}

#[test]
fn test_only_admin_approves() {
    let (env, _, client) = setup();
    let non_admin = Address::generate(&env);
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "test reason");

    let claim_id = client.file_claim(&filed_by, &group_id, &100_000, &reason);
    let result = client.try_approve_claim(&non_admin, &claim_id);
    assert!(result.is_err());
}

#[test]
fn test_fund_balance_queryable() {
    let (env, _, client) = setup();
    let group_id = String::from_str(&env, "group-1");
    let asset = String::from_str(&env, "XLM");

    assert_eq!(client.fund_balance(&asset), 0);

    client.contribute_to_fund(&group_id, &asset, &1_000_000);
    assert_eq!(client.fund_balance(&asset), 1_000_000);
}

#[test]
fn test_claim_count_tracking() {
    let (env, _, client) = setup();
    let filed_by = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");
    let reason = String::from_str(&env, "reason");

    assert_eq!(client.get_claim_count(), 0);

    client.file_claim(&filed_by, &group_id, &100_000, &reason);
    assert_eq!(client.get_claim_count(), 1);

    client.file_claim(&filed_by, &group_id, &200_000, &reason);
    assert_eq!(client.get_claim_count(), 2);
}
