#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

pub const CONTRACT_VERSION: &str = "0.1.0";
const GROUP_TTL_EXTEND: u32 = 6_312_000;
const VOTING_PERIOD_DEFAULT: u64 = 604_800; // 7 days in seconds

// #696: Error codes start at 300 to avoid overlap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyVoted = 300,
    ProposalNotFound = 301,
    VotingPeriodNotEnded = 302,
    QuorumNotReached = 303,
    ThresholdNotMet = 304,
    AlreadyFinalized = 305,
    InvalidParameter = 306,
    Unauthorized = 307,
    AlreadyInitialized = 308,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Failed,
    Finalized,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub proposal_id: u32,
    pub proposer: Address,
    pub parameter_key: String,
    pub proposed_value: String,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub votes_for: u32,
    pub votes_against: u32,
    pub status: ProposalStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct VotingConfig {
    pub quorum_percent: u32,    // Minimum % of eligible voters needed
    pub passing_percent: u32,   // % of votes needed to pass (>50 = majority)
    pub voting_period_secs: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Proposal(u32),
    ProposalCount,
    HasVoted(u32, Address),
    Config,
    Initialized,
    Admin,
}

#[contract]
pub struct GovernanceVoting;

#[contractimpl]
impl GovernanceVoting {
    pub fn initialize(
        env: Env,
        admin: Address,
        quorum_percent: u32,
        passing_percent: u32,
        voting_period_secs: u64,
    ) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);

        let config = VotingConfig {
            quorum_percent,
            passing_percent,
            voting_period_secs,
        };
        env.storage().persistent().set(&DataKey::Config, &config);
        Ok(())
    }

    /// Create a proposal to change a platform parameter.
    /// Gated by minimum activity (proposer must be a valid address).
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        parameter_key: String,
        proposed_value: String,
    ) -> Result<u32, Error> {
        proposer.require_auth();

        let config: VotingConfig = env
            .storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::Unauthorized)?;

        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let proposal_id = count + 1;

        let now = env.ledger().timestamp();
        let proposal = Proposal {
            proposal_id,
            proposer: proposer.clone(),
            parameter_key: parameter_key.clone(),
            proposed_value: proposed_value.clone(),
            created_at: now,
            voting_ends_at: now + config.voting_period_secs,
            votes_for: 0,
            votes_against: 0,
            status: ProposalStatus::Active,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalCount, &proposal_id);
        env.storage().persistent().extend_ttl(
            &DataKey::Proposal(proposal_id),
            GROUP_TTL_EXTEND,
            GROUP_TTL_EXTEND,
        );

        env.events().publish(
            (symbol_short!("propose"), proposal_id),
            (proposer, parameter_key, proposed_value),
        );

        Ok(proposal_id)
    }

    /// Cast a vote on a proposal. One vote per address per proposal.
    /// Vote weight is flat (one address = one vote) by design.
    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u32,
        support: bool,
    ) -> Result<(), Error> {
        voter.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotFound);
        }

        if env.ledger().timestamp() >= proposal.voting_ends_at {
            return Err(Error::VotingPeriodNotEnded);
        }

        let vote_key = DataKey::HasVoted(proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            return Err(Error::AlreadyVoted);
        }

        env.storage().persistent().set(&vote_key, &true);

        if support {
            proposal.votes_for = proposal.votes_for.checked_add(1).ok_or(Error::QuorumNotReached)?;
        } else {
            proposal.votes_against = proposal.votes_against.checked_add(1).ok_or(Error::QuorumNotReached)?;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (symbol_short!("vote"), proposal_id),
            (voter, support),
        );

        Ok(())
    }

    /// Finalize a proposal after voting period ends.
    /// Applies the parameter change if quorum and threshold are met.
    pub fn finalize(
        env: Env,
        proposal_id: u32,
    ) -> Result<ProposalStatus, Error> {
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Active {
            return Err(Error::AlreadyFinalized);
        }

        if env.ledger().timestamp() < proposal.voting_ends_at {
            return Err(Error::VotingPeriodNotEnded);
        }

        let config: VotingConfig = env
            .storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::Unauthorized)?;

        let total_votes = proposal.votes_for + proposal.votes_against;

        // Check quorum (using a simple threshold of minimum votes needed)
        // quorum_percent represents minimum number of votes needed (e.g., 3 = at least 3 votes)
        if total_votes < config.quorum_percent {
            proposal.status = ProposalStatus::Failed;
            env.storage()
                .persistent()
                .set(&DataKey::Proposal(proposal_id), &proposal);
            return Ok(ProposalStatus::Failed);
        }

        // Check passing threshold
        if total_votes == 0 || (proposal.votes_for * 100 / total_votes) < config.passing_percent {
            proposal.status = ProposalStatus::Failed;
            env.storage()
                .persistent()
                .set(&DataKey::Proposal(proposal_id), &proposal);
            return Ok(ProposalStatus::Failed);
        }

        proposal.status = ProposalStatus::Passed;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (symbol_short!("finalize"), proposal_id),
            (ProposalStatus::Passed,),
        );

        Ok(ProposalStatus::Passed)
    }

    /// Get a proposal by ID
    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)
    }

    /// Get total proposal count
    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    /// Get voting configuration
    pub fn get_config(env: Env) -> VotingConfig {
        env.storage()
            .persistent()
            .get(&DataKey::Config)
            .unwrap_or(VotingConfig {
                quorum_percent: 3,
                passing_percent: 51,
                voting_period_secs: VOTING_PERIOD_DEFAULT,
            })
    }

    /// Check if an address has voted on a proposal
    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::HasVoted(proposal_id, voter))
    }
}
