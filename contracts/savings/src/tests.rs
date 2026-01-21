#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

fn create_test_group(env: &Env) -> (Address, SavingsContractClient) {
    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    
    (admin, client)
}

#[test]
fn test_create_group_success() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-1");
    let name = String::from_str(&env, "Test Savings");
    
    let result = client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,  // 10 XLM
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400), // Start tomorrow
        &true,
    );
    
    assert!(result.is_ok());
    
    let group = client.get_group().unwrap();
    assert_eq!(group.name, name);
    assert_eq!(group.total_members, 5);
    assert_eq!(group.status, GroupStatus::Open);
}

#[test]
fn test_create_group_low_contribution() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-2");
    let name = String::from_str(&env, "Test Savings");
    
    let result = client.create_group(
        &admin,
        &group_id,
        &name,
        &5_000_000,  // 0.5 XLM - too low
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );
    
    assert!(result.is_err());
}

#[test]
fn test_join_group() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-3");
    let name = String::from_str(&env, "Test Savings");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    ).unwrap();
    
    // Admin is auto-joined
    let members = client.get_members();
    assert_eq!(members.len(), 1);
    
    // Second member joins
    let member2 = Address::generate(&env);
    let result = client.join_group(&member2);
    assert!(result.is_ok());
    
    let members = client.get_members();
    assert_eq!(members.len(), 2);
    
    // Third member joins - group should become Active
    let member3 = Address::generate(&env);
    client.join_group(&member3).unwrap();
    
    let group = client.get_group().unwrap();
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);
}

#[test]
fn test_cannot_join_full_group() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-4");
    let name = String::from_str(&env, "Test Savings");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    ).unwrap();
    
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    let member4 = Address::generate(&env);
    
    client.join_group(&member2).unwrap();
    client.join_group(&member3).unwrap();
    
    // Group is now full
    let result = client.join_group(&member4);
    assert!(result.is_err());
}

#[test]
fn test_cannot_join_twice() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-5");
    let name = String::from_str(&env, "Test Savings");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &5,
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    ).unwrap();
    
    let member = Address::generate(&env);
    client.join_group(&member).unwrap();
    
    // Try to join again
    let result = client.join_group(&member);
    assert!(result.is_err());
}

#[test]
fn test_contribution_flow() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-6");
    let name = String::from_str(&env, "Test Savings");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100), // Start soon
        &true,
    ).unwrap();
    
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    
    client.join_group(&member2).unwrap();
    client.join_group(&member3).unwrap();
    
    // Group is now active
    let group = client.get_group().unwrap();
    assert_eq!(group.status, GroupStatus::Active);
    
    // Fast forward time
    env.ledger().with_mut(|li| li.timestamp = group.start_timestamp + 1);
    
    // Members make contributions
    client.contribute(&admin).unwrap();
    
    let member_data = client.get_member(&admin).unwrap();
    assert_eq!(member_data.status, MemberStatus::PaidCurrentRound);
    assert_eq!(member_data.total_contributed, 100_000_000);
    
    client.contribute(&member2).unwrap();
    
    // Last contribution should trigger payout
    client.contribute(&member3).unwrap();
    
    // Check first member got payout
    let admin_data = client.get_member(&admin).unwrap();
    assert!(admin_data.has_received_payout);
}

#[test]
fn test_cannot_contribute_twice() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-7");
    let name = String::from_str(&env, "Test Savings");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    ).unwrap();
    
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    
    client.join_group(&member2).unwrap();
    client.join_group(&member3).unwrap();
    
    let group = client.get_group().unwrap();
    env.ledger().with_mut(|li| li.timestamp = group.start_timestamp + 1);
    
    client.contribute(&admin).unwrap();
    
    // Try to contribute again
    let result = client.contribute(&admin);
    assert!(result.is_err());
}

#[test]
fn test_member_count_validation() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-8");
    let name = String::from_str(&env, "Test Savings");
    
    // Too few members
    let result = client.create_group(
        &admin,
        &group_id.clone(),
        &name.clone(),
        &100_000_000,
        &2,  // Less than minimum
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );
    assert!(result.is_err());
    
    // Too many members
    let result = client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &25,  // More than maximum
        &Frequency::Monthly,
        &(env.ledger().timestamp() + 86400),
        &true,
    );
    assert!(result.is_err());
}

#[test]
fn test_full_cycle() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-9");
    let name = String::from_str(&env, "Full Cycle Test");
    
    let member_count = 3u32;
    let contribution = 100_000_000i128;
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &contribution,
        &member_count,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    ).unwrap();
    
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    
    client.join_group(&member2).unwrap();
    client.join_group(&member3).unwrap();
    
    let group = client.get_group().unwrap();
    env.ledger().with_mut(|li| li.timestamp = group.start_timestamp + 1);
    
    // Round 1
    client.contribute(&admin).unwrap();
    client.contribute(&member2).unwrap();
    client.contribute(&member3).unwrap();
    
    let payouts = client.get_round_payouts(&1);
    assert_eq!(payouts.len(), 1);
    
    // Verify group moved to round 2
    let group = client.get_group().unwrap();
    assert_eq!(group.current_round, 2);
    
    // Round 2
    env.ledger().with_mut(|li| li.timestamp += 604800);
    
    client.contribute(&admin).unwrap();
    client.contribute(&member2).unwrap();
    client.contribute(&member3).unwrap();
    
    // Round 3
    env.ledger().with_mut(|li| li.timestamp += 604800);
    
    client.contribute(&admin).unwrap();
    client.contribute(&member2).unwrap();
    client.contribute(&member3).unwrap();
    
    // Group should be completed
    let group = client.get_group().unwrap();
    assert_eq!(group.status, GroupStatus::Completed);
    
    // All members should have received payout
    assert!(client.get_member(&admin).unwrap().has_received_payout);
    assert!(client.get_member(&member2).unwrap().has_received_payout);
    assert!(client.get_member(&member3).unwrap().has_received_payout);
}

#[test]
fn test_payout_order() {
    let env = Env::default();
    env.mock_all_auths();
    
    let (admin, client) = create_test_group(&env);
    let group_id = String::from_str(&env, "test-group-10");
    let name = String::from_str(&env, "Payout Order Test");
    
    client.create_group(
        &admin,
        &group_id,
        &name,
        &100_000_000,
        &3,
        &Frequency::Weekly,
        &(env.ledger().timestamp() + 100),
        &true,
    ).unwrap();
    
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    
    client.join_group(&member2).unwrap();
    client.join_group(&member3).unwrap();
    
    // Verify join order
    assert_eq!(client.get_member(&admin).unwrap().join_order, 0);
    assert_eq!(client.get_member(&member2).unwrap().join_order, 1);
    assert_eq!(client.get_member(&member3).unwrap().join_order, 2);
    
    let group = client.get_group().unwrap();
    env.ledger().with_mut(|li| li.timestamp = group.start_timestamp + 1);
    
    // Complete round 1
    client.contribute(&admin).unwrap();
    client.contribute(&member2).unwrap();
    client.contribute(&member3).unwrap();
    
    // Admin (join_order 0) should receive first payout
    let payouts = client.get_round_payouts(&1);
    assert_eq!(payouts.get(0).unwrap().recipient, admin);
    
    env.ledger().with_mut(|li| li.timestamp += 604800);
    
    // Complete round 2
    client.contribute(&admin).unwrap();
    client.contribute(&member2).unwrap();
    client.contribute(&member3).unwrap();
    
    // member2 (join_order 1) should receive second payout
    let payouts = client.get_round_payouts(&2);
    assert_eq!(payouts.get(0).unwrap().recipient, member2);
}