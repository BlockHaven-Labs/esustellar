# Audit verification: CODEOWNERS, ECS execution role secrets, key-rotation NetworkPolicy and Terraform variable descriptions

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1329 — CODEOWNERS for infra paths

- **Resolution:** Infra-related paths have explicit owners.
- **Evidence:** `.github/CODEOWNERS:37` (`/infra/`), `:42` (`/.github/workflows/`), `:48` (`/k8s/`), `:50` (`/environments/`), `:58-59` (secrets paths); explanation in the header
- **Status:** Satisfied as a file. It only *requests* review: the `main` branch protection must also enable 'Require review from Code Owners' (see `docs/branch-protection.md`); that setting lives in GitHub, not in this repo, and was not checked.

## #1330 — ECS execution role access to secrets

- **Resolution:** The role has scoped Secrets Manager and SSM permissions, driven by input variables.
- **Evidence:** `infra/terraform/modules/iam/main.tf:22-24` (rationale against `*`), `:72-75` (`secretsmanager:GetSecretValue` on `var.secretsmanager_secret_arns`), `:85-89` (SSM reads on `var.ssm_parameter_arns`); ECS is not a live path per `infra/README.md`
- **Status:** Satisfied. Which injection mechanism ECS would use is moot while ECS is unused.

## #1331 — NetworkPolicy for the deployer-key job

- **Resolution:** A dedicated namespace with default-deny policies exists.
- **Evidence:** `infra/k8s/keyops.yaml:1-33` (egress limited to the Stellar network, rationale), `:38` (`esustellar-keyops` namespace), `:48` (`deployer-key-rotation`), `:55-` (deny-all policies); `infra/k8s/network-policies.yaml:6-10` (explains the separation)
- **Status:** Satisfied.

## #1332 — Terraform variable descriptions

- **Resolution:** Every `variable` block in every `variables.tf` has a `description`, and a checker exists.
- **Evidence:** `infra/scripts/check-terraform-variable-docs.py` (checker); verified here by scanning every `variables.tf` for `variable` blocks with no `description` (none found)
- **Status:** Satisfied. This verification did not execute the checker script.

