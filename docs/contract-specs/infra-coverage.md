# Contract-to-Infra Operational Coverage

Maps each contract under `contracts/` to its operational surface.
"Monitored" = covered by an existing dashboard/alert; "ECR" = built
into a container image; "WASM-only" = deployed as a Soroban WASM
artifact with no container image.

| Contract | ECR / WASM-only | Monitored | Dedicated alert |
|---|---|---|---|
| governance_voting | WASM-only | No | No |
| group_delegation | WASM-only | No | No |
| group_insurance_fund | WASM-only | No | No |
| late_payment_penalty | WASM-only | No | No |
| migration_coordinator | WASM-only | No | No |
| notification_relay | WASM-only | No | No |
| oracle_feed | WASM-only | Yes | Yes |
| referral_rewards | WASM-only | No | No |
| savings | WASM-only | Yes | Yes (high-balance-alert) |
| registry | WASM-only | No | No |
| social_vouching | WASM-only | No | No |
| integration_tests | N/A (test-only) | N/A | N/A |

## Gap
10 of 12 contracts have no dedicated monitoring or alerting today.
`savings` and `oracle_feed` are the only ones covered, matching the
two named alert groups found in the infra audit.

## Follow-up
Prioritize monitoring for `group_insurance_fund` and
`late_payment_penalty` next, since both directly affect user funds.
