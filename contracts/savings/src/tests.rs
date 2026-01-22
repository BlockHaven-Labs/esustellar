use crate::{SavingsContract, SavingsContractClient, GroupStatus, MemberStatus, Frequency};
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String};

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

        let group = client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &5, &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400), &true,
        );

        assert_eq!(group.name, name);
        assert_eq!(group.total_members, 5);
        assert_eq!(group.status, GroupStatus::Open);
    }

    #[test]
    #[should_panic]
    fn test_create_group_low_contribution() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-2");
        let name = String::from_str(&env, "Test Savings");

        client.create_group(
            &admin, &group_id, &name,
            &5_000_000, &5, &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400), &true,
        );
    }

    #[test]
    fn test_join_group() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-3");
        let name = String::from_str(&env, "Test Savings");

        client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &3, &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400), &true,
        );

        let members = client.get_members();
        assert_eq!(members.len(), 1);

        let member2 = Address::generate(&env);
        client.join_group(&member2);

        let members = client.get_members();
        assert_eq!(members.len(), 2);

        let member3 = Address::generate(&env);
        client.join_group(&member3);

        let group = client.get_group();
        assert_eq!(group.status, GroupStatus::Active);
        assert_eq!(group.current_round, 1);
    }

    #[test]
    #[should_panic]
    fn test_cannot_join_full_group() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-4");
        let name = String::from_str(&env, "Test Savings");

        client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &3, &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400), &true,
        );

        let member2 = Address::generate(&env);
        let member3 = Address::generate(&env);
        let member4 = Address::generate(&env);

        client.join_group(&member2);
        client.join_group(&member3);
        client.join_group(&member4); // Should panic
    }

    #[test]
    #[should_panic]
    fn test_cannot_join_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-5");
        let name = String::from_str(&env, "Test Savings");

        client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &5, &Frequency::Monthly,
            &(env.ledger().timestamp() + 86400), &true,
        );

        let member = Address::generate(&env);
        client.join_group(&member);
        client.join_group(&member); // Should panic
    }

    #[test]
    fn test_contribution_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-6");
        let name = String::from_str(&env, "Test Savings");

        client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &3, &Frequency::Weekly,
            &(env.ledger().timestamp() + 100), &true,
        );

        let member2 = Address::generate(&env);
        let member3 = Address::generate(&env);

        client.join_group(&member2);
        client.join_group(&member3);

        let group = client.get_group();
        assert_eq!(group.status, GroupStatus::Active);

        // Fast forward time
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + 1;
        });

        client.contribute(&admin);

        let member_data = client.get_member(&admin);
        assert_eq!(member_data.status, MemberStatus::PaidCurrentRound);
        assert_eq!(member_data.total_contributed, 100_000_000);

        client.contribute(&member2);
        client.contribute(&member3);

        let admin_data = client.get_member(&admin);
        assert!(admin_data.has_received_payout);
    }

    #[test]
    fn test_payout_order() {
        let env = Env::default();
        env.mock_all_auths();

        let (admin, client) = create_test_group(&env);
        let group_id = String::from_str(&env, "test-group-7");
        let name = String::from_str(&env, "Payout Order Test");

        client.create_group(
            &admin, &group_id, &name,
            &100_000_000, &3, &Frequency::Weekly,
            &(env.ledger().timestamp() + 100), &true,
        );

        let member2 = Address::generate(&env);
        let member3 = Address::generate(&env);

        client.join_group(&member2);
        client.join_group(&member3);

        assert_eq!(client.get_member(&admin).join_order, 0);
        assert_eq!(client.get_member(&member2).join_order, 1);
        assert_eq!(client.get_member(&member3).join_order, 2);

        let group = client.get_group();
        env.ledger().with_mut(|li| {
            li.timestamp = group.start_timestamp + 1;
        });

        client.contribute(&admin);
        client.contribute(&member2);
        client.contribute(&member3);

        let payouts = client.get_round_payouts(&1);
        assert_eq!(payouts.get(0).unwrap().recipient, admin);
    }

