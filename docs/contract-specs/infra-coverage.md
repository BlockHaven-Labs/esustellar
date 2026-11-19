# Contract-to-Infra Operational Coverage

Maps each contract under `contracts/` to its operational surface.

- **ECR repository** — a repository is declared in
  `infra/terraform/modules/ecr/main.tf` (`repos = ["savings", "registry",
  "esustellar-web", "balance-exporter"]`). No Terraform root currently
  instantiates that module and no workflow publishes to ECR; these are
  declared-but-unused repositories, not live images.
- **WASM-only** — deployed as a Soroban WASM artifact via `deploy.sh`; no
  container image is built for the contract itself.
- **Monitoring** — a dashboard or alert rule exists that covers the
  contract's runtime behaviour.

| Contract | ECR repository declared | Artifact | Monitoring / dashboard | Dedicated alert | Notes |
|---|---|---|---|---|---|
| `governance_voting` | No | WASM-only | None | None | No contract-specific metrics scraped. |
| `group_delegation` | No | WASM-only | None | None | Covered only by generic `ContractCallFailureRate` when instrumented. |
| `group_insurance_fund` | No | WASM-only | None | None | Funds at risk — priority gap. |
| `late_payment_penalty` | No | WASM-only | None | None | Funds at risk — priority gap. |
| `migration_coordinator` | No | WASM-only | None | None | One-off operational use; no dashboard. |
| `notification_relay` | No | WASM-only | None | None | No alert on relay delivery failures. |
| `oracle_feed` | No | WASM-only | On-chain events dashboard | Yes (`StellarRpc*` alert group covers feed freshness indirectly) | No dedicated staleness alert per oracle. |
| `referral_rewards` | No | WASM-only | None | None | — |
| `savings` | Yes (`...-savings`) | WASM-only; repo reserved, no image published | On-chain events dashboard | Yes (high-balance runbook) | ECR repo is declared but unused today. |
| `registry` | Yes (`...-registry`) | WASM-only; repo reserved, no image published | None | None | ECR repo is declared but unused today. |
| `social_vouching` | No | WASM-only | None | None | — |
| `integration_tests` | No | Test-only harness | N/A | N/A | Not deployed. |

Non-contract images in the same ECR module: `...-esustellar-web` (the web
deployment actually pulls from `ghcr.io/blockhaven-labs/esustellar-web`,
see `docs/runbooks/dual-manifest-tree-incident.md`) and `...-balance-exporter`
(Dockerfile exists, no configured publish destination or deployment image).

## Gaps

- 10 of 12 contracts have no contract-specific monitoring or alerting.
  `savings` and `oracle_feed` are the only ones with any runtime coverage,
  matching the two named alert groupings found in the infra audit.
- Two ECR repositories (`savings`, `registry`) exist in Terraform only;
  they do not represent published container images. Do not infer deployment
  coverage from their presence.
- `ContractCallFailureRate` in `rpc-alerts.yaml` is label-driven
  (`contract_id`) and will cover any instrumented caller, but it is not a
  dedicated per-contract alert.

## Follow-up

Prioritize monitoring for `group_insurance_fund` and
`late_payment_penalty` next, since both directly affect user funds.
Resolve the ECR/GHCR split before adding per-contract image coverage.
