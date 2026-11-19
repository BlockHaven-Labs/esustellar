# Audit verification: Probe overrides, VPC outputs, CDN invalidation and CDN price class

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1317 — probe differences between environments

- **Resolution:** Probe timing is overridden per overlay (it was previously unoverridden).
- **Evidence:** `infra/k8s/overlays/mainnet/kustomization.yaml:49-55` (readiness period/threshold, liveness initial delay), `infra/k8s/overlays/testnet/kustomization.yaml:70-76`, `infra/k8s/overlays/staging/kustomization.yaml:38`
- **Status:** Satisfied.

## #1318 — VPC outputs for a future database module

- **Resolution:** Private subnet IDs and security group IDs are exposed.
- **Evidence:** `infra/terraform/modules/vpc/outputs.tf:33` (`private_subnet_ids`), `:43` (`private_subnets_by_az`), `:72` (`workload_security_group_id`), `:77` (`security_group_ids`); header comment explains the downstream use
- **Status:** Satisfied. There is still no database module (see issue 1303 in the same audit).

## #1319 — CDN invalidation after rollout

- **Resolution:** The deploy runbook invalidates CloudFront after rollout and there is a script for it.
- **Evidence:** `docs/deployment.md:102-111` (step 4a, rollout then invalidate), `infra/scripts/invalidate-cdn-cache.sh`, `infra/terraform/modules/cdn/main.tf:35-36` (comment pointing to both), CI/CD role permission in `infra/terraform/modules/iam/main.tf`
- **Status:** Satisfied as documentation. There is no committed workflow that runs it (the production deploy workflow is not committed; see `infra/README.md`).

## #1320 — per-environment CloudFront price class

- **Resolution:** Non-mainnet environments are restricted to `PriceClass_100`; mainnet may use broader classes.
- **Evidence:** `infra/terraform/modules/cdn/main.tf:6-20` (permitted classes by `var.environment`), `:28` (`price_class = var.price_class`), `:91` (precondition `contains(local.price_class_permitted, ...)`), `infra/terraform/modules/cdn/variables.tf:58` (`price_class` variable)
- **Status:** Satisfied. A non-mainnet environment that asks for a wider class fails the precondition.

