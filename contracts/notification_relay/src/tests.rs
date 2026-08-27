use crate::{Error, NotificationRelay, NotificationRelayClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, Address, NotificationRelayClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NotificationRelay, ());
    let client = NotificationRelayClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_add_approved_caller() {
    let (env, admin, client) = setup();
    let caller = Address::generate(&env);

    client.add_approved_caller(&admin, &caller);
    assert!(client.is_approved(&caller));
}

#[test]
fn test_remove_approved_caller() {
    let (env, admin, client) = setup();
    let caller = Address::generate(&env);

    client.add_approved_caller(&admin, &caller);
    client.remove_approved_caller(&admin, &caller);
    assert!(!client.is_approved(&caller));
}

#[test]
fn test_emit_notification_approved() {
    let (env, admin, client) = setup();
    let caller = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.add_approved_caller(&admin, &caller);

    let ntype = String::from_str(&env, "due");
    let hash = String::from_str(&env, "abc123");

    client.emit_notification(&caller, &recipient, &ntype, &hash);
}

#[test]
fn test_emit_notification_unapproved_fails() {
    let (env, _, client) = setup();
    let caller = Address::generate(&env);
    let recipient = Address::generate(&env);

    let ntype = String::from_str(&env, "due");
    let hash = String::from_str(&env, "abc123");

    let result = client.try_emit_notification(&caller, &recipient, &ntype, &hash);
    assert!(result.is_err());
}

#[test]
fn test_only_admin_adds_caller() {
    let (env, _, client) = setup();
    let non_admin = Address::generate(&env);
    let caller = Address::generate(&env);

    let result = client.try_add_approved_caller(&non_admin, &caller);
    assert!(result.is_err());
}

#[test]
fn test_get_approved_callers() {
    let (env, admin, client) = setup();
    let c1 = Address::generate(&env);
    let c2 = Address::generate(&env);

    client.add_approved_caller(&admin, &c1);
    client.add_approved_caller(&admin, &c2);

    let callers = client.get_approved_callers();
    assert_eq!(callers.len(), 2);
}
