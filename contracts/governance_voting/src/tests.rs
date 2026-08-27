use crate::{Error, GovernanceVoting, GovernanceVotingClient, ProposalStatus};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, Address, GovernanceVotingClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });
    let contract_id = env.register(GovernanceVoting, ());
    let client = GovernanceVotingClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    // quorum=3, passing=51%, voting period=7 days
    client.initialize(&admin, &3, &51, &604_800);
    (env, admin, client)
}

#[test]
fn test_create_proposal() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);
    assert_eq!(id, 1);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.parameter_key, param);
    assert_eq!(proposal.proposed_value, value);
}

#[test]
fn test_vote() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);
    client.vote(&voter, &id, &true);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.votes_for, 1);
    assert_eq!(proposal.votes_against, 0);
}

#[test]
fn test_cannot_vote_twice() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);
    client.vote(&voter, &id, &true);
    let result = client.try_vote(&voter, &id, &true);
    assert!(result.is_err());
}

#[test]
fn test_finalize_passed() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);

    // 3 votes for, 0 against (meets quorum=3, >51%)
    for _ in 0..3 {
        let voter = Address::generate(&env);
        client.vote(&voter, &id, &true);
    }

    // Advance time past voting period
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000 + 604_801;
    });

    let status = client.finalize(&id);
    assert_eq!(status, ProposalStatus::Passed);
}

#[test]
fn test_finalize_failed_quorum() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);

    // Only 2 votes (below quorum of 3)
    for _ in 0..2 {
        let voter = Address::generate(&env);
        client.vote(&voter, &id, &true);
    }

    env.ledger().with_mut(|li| {
        li.timestamp = 100_000 + 604_801;
    });

    let status = client.finalize(&id);
    assert_eq!(status, ProposalStatus::Failed);
}

#[test]
fn test_finalize_failed_threshold() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);

    // 3 for, 4 against (meets quorum but <51%)
    for _ in 0..3 {
        let voter = Address::generate(&env);
        client.vote(&voter, &id, &true);
    }
    for _ in 0..4 {
        let voter = Address::generate(&env);
        client.vote(&voter, &id, &false);
    }

    env.ledger().with_mut(|li| {
        li.timestamp = 100_000 + 604_801;
    });

    let status = client.finalize(&id);
    assert_eq!(status, ProposalStatus::Failed);
}

#[test]
fn test_cannot_finalize_before_voting_ends() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);
    let result = client.try_finalize(&id);
    assert!(result.is_err());
}

#[test]
fn test_cannot_vote_after_period() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);

    env.ledger().with_mut(|li| {
        li.timestamp = 100_000 + 604_801;
    });

    let result = client.try_vote(&voter, &id, &true);
    assert!(result.is_err());
}

#[test]
fn test_has_voted() {
    let (env, _, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    let param = String::from_str(&env, "fee_percent");
    let value = String::from_str(&env, "300");

    let id = client.create_proposal(&proposer, &param, &value);
    assert!(!client.has_voted(&id, &voter.clone()));

    client.vote(&voter, &id, &true);
    assert!(client.has_voted(&id, &voter));
}
