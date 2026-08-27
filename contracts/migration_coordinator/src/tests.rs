use crate::{MigrationCoordinator, MigrationCoordinatorClient};
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};

fn setup() -> (Env, Address, MigrationCoordinatorClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(MigrationCoordinator, ());
    let client = MigrationCoordinatorClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_register_version() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let version = String::from_str(&env, "0.1.0");
    let addr = Address::generate(&env);

    let info = client.register_version(&admin, &name, &version, &addr);
    assert_eq!(info.address, addr);
    assert!(!info.is_deprecated);
}

#[test]
fn test_register_updates_current() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let v1 = String::from_str(&env, "0.1.0");
    let v2 = String::from_str(&env, "0.2.0");
    let addr1 = Address::generate(&env);
    let addr2 = Address::generate(&env);

    client.register_version(&admin, &name, &v1, &addr1);
    let current = client.get_current(&name);
    assert_eq!(current, addr1);

    client.register_version(&admin, &name, &v2, &addr2);
    let current2 = client.get_current(&name);
    assert_eq!(current2, addr2);
}

#[test]
fn test_deprecate_version() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let version = String::from_str(&env, "0.1.0");
    let addr = Address::generate(&env);

    client.register_version(&admin, &name, &version, &addr);
    client.deprecate_version(&admin, &name, &version);

    let info = client.get_version_info(&name, &version);
    assert!(info.is_deprecated);
}

#[test]
fn test_deprecated_still_queryable() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let version = String::from_str(&env, "0.1.0");
    let addr = Address::generate(&env);

    client.register_version(&admin, &name, &version, &addr);
    client.deprecate_version(&admin, &name, &version);

    // Can still query version info (returns directly, not Result)
    let info = client.get_version_info(&name, &version);
    assert!(info.is_deprecated);
}

#[test]
fn test_cannot_deprecate_twice() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let version = String::from_str(&env, "0.1.0");
    let addr = Address::generate(&env);

    client.register_version(&admin, &name, &version, &addr);
    client.deprecate_version(&admin, &name, &version);

    let result = client.try_deprecate_version(&admin, &name, &version);
    assert!(result.is_err());
}

#[test]
fn test_admin_only() {
    let (env, _, client) = setup();
    let non_admin = Address::generate(&env);
    let name = String::from_str(&env, "savings");
    let version = String::from_str(&env, "0.1.0");
    let addr = Address::generate(&env);

    let result = client.try_register_version(&non_admin, &name, &version, &addr);
    assert!(result.is_err());
}

#[test]
fn test_get_all_versions() {
    let (env, admin, client) = setup();
    let name = String::from_str(&env, "savings");
    let v1 = String::from_str(&env, "0.1.0");
    let v2 = String::from_str(&env, "0.2.0");
    let addr = Address::generate(&env);

    client.register_version(&admin, &name, &v1, &addr);
    client.register_version(&admin, &name, &v2, &addr);

    let versions = client.get_all_versions(&name);
    assert_eq!(versions.len(), 2);
}

#[test]
fn test_get_current_no_versions() {
    let (env, _, client) = setup();
    let name = String::from_str(&env, "savings");

    let result = client.try_get_current(&name);
    assert!(result.is_err());
}
