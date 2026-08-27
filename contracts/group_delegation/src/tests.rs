use crate::{Delegation, Error, GroupDelegation, GroupDelegationClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, Address, GroupDelegationClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(GroupDelegation, ());
    let client = GroupDelegationClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_authorize_delegate() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    let d = client.authorize_delegate(&member, &delegate, &group_id);
    assert_eq!(d.member, member);
    assert_eq!(d.delegate, delegate);
    assert_eq!(d.group_id, group_id);
}

#[test]
fn test_cannot_delegate_to_self() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    let result = client.try_authorize_delegate(&member, &member, &group_id);
    assert!(result.is_err());
}

#[test]
fn test_cannot_delegate_twice() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    client.authorize_delegate(&member, &delegate, &group_id);
    let result = client.try_authorize_delegate(&member, &delegate, &group_id);
    assert!(result.is_err());
}

#[test]
fn test_revoke_delegate() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    client.authorize_delegate(&member, &delegate, &group_id);
    assert!(client.has_vouched(&member, &delegate, &group_id));

    client.revoke_delegate(&member, &delegate, &group_id);
    assert!(!client.has_vouched(&member, &delegate, &group_id));
}

#[test]
fn test_revoke_nonexistent_fails() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    let result = client.try_revoke_delegate(&member, &delegate, &group_id);
    assert!(result.is_err());
}

#[test]
fn test_contribute_as_delegate() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    client.authorize_delegate(&member, &delegate, &group_id);
    // Should succeed - delegate is authorized
    client.contribute_as_delegate(&delegate, &member, &group_id, &100_000_000);
}

#[test]
fn test_contribute_as_unauthorized_delegate_fails() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    let result = client.try_contribute_as_delegate(&delegate, &member, &group_id, &100_000_000);
    assert!(result.is_err());
}

#[test]
fn test_delegation_scoped_per_group() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let delegate = Address::generate(&env);
    let group1 = String::from_str(&env, "group-1");
    let group2 = String::from_str(&env, "group-2");

    client.authorize_delegate(&member, &delegate, &group1);

    // Authorized in group1
    assert!(client.has_vouched(&member, &delegate, &group1));
    // Not authorized in group2
    assert!(!client.has_vouched(&member, &delegate, &group2));

    // Can authorize for group2 separately
    client.authorize_delegate(&member, &delegate, &group2);
    assert!(client.has_vouched(&member, &delegate, &group2));
}

#[test]
fn test_get_delegates() {
    let (env, _, client) = setup();
    let member = Address::generate(&env);
    let d1 = Address::generate(&env);
    let d2 = Address::generate(&env);
    let group_id = String::from_str(&env, "group-1");

    client.authorize_delegate(&member, &d1, &group_id);
    client.authorize_delegate(&member, &d2, &group_id);

    let delegates = client.get_delegates(&member, &group_id);
    assert_eq!(delegates.len(), 2);
}
