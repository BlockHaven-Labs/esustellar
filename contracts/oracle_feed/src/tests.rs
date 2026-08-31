use crate::{OracleFeed, OracleFeedClient};
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String};

fn setup() -> (Env, Address, OracleFeedClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(OracleFeed, ());
    let client = OracleFeedClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

#[test]
fn test_add_publisher_and_publish() {
    let (env, admin, client) = setup();
    let publisher = Address::generate(&env);

    client.add_publisher(&admin, &publisher);

    let asset = String::from_str(&env, "USDC");
    client.publish_price(&publisher, &asset, &100_000_000, &8);

    let price = client.latest_price(&asset);
    assert_eq!(price.price, 100_000_000);
    assert_eq!(price.decimals, 8);
}

#[test]
fn test_not_publisher_rejected() {
    let (env, _, client) = setup();
    let publisher = Address::generate(&env);
    let asset = String::from_str(&env, "USDC");

    let result = client.try_publish_price(&publisher, &asset, &100, &8);
    assert!(result.is_err());
}

#[test]
fn test_admin_only() {
    let (env, _, client) = setup();
    let non_admin = Address::generate(&env);
    let publisher = Address::generate(&env);

    let result = client.try_add_publisher(&non_admin, &publisher);
    assert!(result.is_err());
}

#[test]
fn test_remove_publisher() {
    let (env, admin, client) = setup();
    let publisher = Address::generate(&env);

    client.add_publisher(&admin, &publisher);
    let asset = String::from_str(&env, "USDC");
    client.publish_price(&publisher, &asset, &100, &8);

    client.remove_publisher(&admin, &publisher);

    // Can no longer publish new prices
    let result = client.try_publish_price(&publisher, &asset, &200, &8);
    assert!(result.is_err());

    // Old prices still queryable
    let price = client.latest_price(&asset);
    assert_eq!(price.price, 100);
}

#[test]
fn test_latest_price_no_data() {
    let (env, _, client) = setup();
    let asset = String::from_str(&env, "USDC");

    let result = client.try_latest_price(&asset);
    assert!(result.is_err());
}

#[test]
fn test_publish_updates_price() {
    let (env, admin, client) = setup();
    let publisher = Address::generate(&env);
    let asset = String::from_str(&env, "USDC");

    client.add_publisher(&admin, &publisher);

    client.publish_price(&publisher, &asset, &100, &8);
    let p1 = client.latest_price(&asset);
    assert_eq!(p1.price, 100);

    client.publish_price(&publisher, &asset, &200, &8);
    let p2 = client.latest_price(&asset);
    assert_eq!(p2.price, 200);
}
