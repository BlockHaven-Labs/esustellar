use crate::{Error, GroupRegistry, GroupRegistryClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, String,
};

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

fn create_registry(env: &Env) -> GroupRegistryClient<'_> {
    let contract_id = env.register(GroupRegistry, ());
    GroupRegistryClient::new(env, &contract_id)
}

#[test]
fn test_register_group_normalizes_group_id() {
    let env = setup_env();
    let client = create_registry(&env);

    // Deploy mock savings contract
    let savings_contract_id = env.register(esustellar_savings::SavingsContract, ());
    let savings_client = esustellar_savings::SavingsContractClient::new(&env, &savings_contract_id);
    let admin = Address::generate(&env);

    let raw_group_id = String::from_str(&env, "  Community-Vault-2026  ");
    let name = String::from_str(&env, "Community Vault");

    savings_client.create_group(
        &admin,
        &raw_group_id,
        &name,
        &100_000_000,
        &5,
        &esustellar_savings::Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin,
        &None,
    );

    // Register with raw unnormalized ID
    client.register_group(
        &savings_contract_id,
        &raw_group_id,
        &name,
        &admin,
        &true,
        &5,
    );

    let info = client.get_group_info(&savings_contract_id);
    let expected_canonical_id = String::from_str(&env, "community-vault-2026");
    assert_eq!(info.group_id, expected_canonical_id);
}

#[test]
fn test_register_group_prevents_duplicate_normalized_id() {
    let env = setup_env();
    let client = create_registry(&env);

    let savings_contract_1 = env.register(esustellar_savings::SavingsContract, ());
    let savings_client_1 = esustellar_savings::SavingsContractClient::new(&env, &savings_contract_1);
    let admin_1 = Address::generate(&env);

    let group_id_1 = String::from_str(&env, "StellarBuilders");
    let name = String::from_str(&env, "Stellar Builders");

    savings_client_1.create_group(
        &admin_1,
        &group_id_1,
        &name,
        &100_000_000,
        &5,
        &esustellar_savings::Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin_1,
        &None,
    );

    client.register_group(
        &savings_contract_1,
        &group_id_1,
        &name,
        &admin_1,
        &true,
        &5,
    );

    // Deploy a second savings contract
    let savings_contract_2 = env.register(esustellar_savings::SavingsContract, ());
    let savings_client_2 = esustellar_savings::SavingsContractClient::new(&env, &savings_contract_2);
    let admin_2 = Address::generate(&env);

    // Same name but different casing/spacing
    let group_id_2 = String::from_str(&env, "  stellarbuilders  ");
    savings_client_2.create_group(
        &admin_2,
        &group_id_2,
        &name,
        &100_000_000,
        &5,
        &esustellar_savings::Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
        &admin_2,
        &None,
    );

    // Attempt to register in registry under different casing must be rejected
    let result = client.try_register_group(
        &savings_contract_2,
        &group_id_2,
        &name,
        &admin_2,
        &true,
        &5,
    );

    assert_eq!(result, Err(Ok(Error::GroupAlreadyRegistered)));
}

#[test]
fn test_register_group_invalid_empty_id() {
    let env = setup_env();
    let client = create_registry(&env);
    let contract_addr = Address::generate(&env);
    let admin = Address::generate(&env);

    let empty_id = String::from_str(&env, "   ");
    let name = String::from_str(&env, "Invalid");

    let res = client.try_register_group(
        &contract_addr,
        &empty_id,
        &name,
        &admin,
        &true,
        &5,
    );

    assert_eq!(res, Err(Ok(Error::InvalidGroupId)));
}
