# Audit verification: Terraform roots, shared modules and the environments/ tree

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1434 — multiple Terraform roots

- **Resolution:** The roots are documented with a state-key map and an explanation of what is and is not a root.
- **Evidence:** `infra/docs/terraform-state.md:6-22` (map of roots, backends, state keys; `environments/testnet` is not a root), `infra/terraform/README.md` (roots and shared modules), `infra/README.md:44-92` (canonical sources table)
- **Status:** Satisfied by documentation. The roots were not merged into one; the docs state why they remain separate.

## #1435 — infra/testnet duplicating infra/terraform

- **Resolution:** `infra/testnet` calls the shared modules instead of redeclaring resources.
- **Evidence:** `infra/testnet/main.tf:4-5` (`module "storage"` from `../terraform/modules/storage`), `:15-16` (`module "vpc"` from `../terraform/modules/vpc`), `infra/terraform/README.md:30` (both roots instantiate the shared modules)
- **Status:** Satisfied.

## #1436 — environments/testnet vs infra/testnet

- **Resolution:** `environments/testnet` is archived; the canonical testnet deployment is named.
- **Evidence:** `environments/testnet/README.md:3-10` (ARCHIVED, Kubernetes tree removed per #1027, `infra/k8s/overlays/testnet/` canonical), `infra/docs/terraform-state.md:22` (not a Terraform root)
- **Status:** Satisfied.

## #1437 — environments/staging has no k8s manifests

- **Resolution:** The README states that staging's Kubernetes workload comes from `infra/k8s/overlays/staging`.
- **Evidence:** `environments/staging/README.md:38-39` (`kubectl apply -k infra/k8s/overlays/staging`)
- **Status:** Satisfied.

