# Audit verification: ACM validation ordering, DNS failover, rollback scope and healthcheck exit codes

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1321 — ACM validation record lifecycle

- **Resolution:** Validation records and the certificate validation have explicit ordering and `create_before_destroy`.
- **Evidence:** `infra/terraform/modules/ssl/main.tf:18-19` (certificate lifecycle), `:31-45` (explanation), `:63-67` (`create_before_destroy` and `depends_on = [aws_acm_certificate.this]` on the records), `:74-81` (certificate validation `depends_on` the records)
- **Status:** Satisfied.

## #1322 — DNS failover

- **Resolution:** Optional failover (PRIMARY/SECONDARY) is implemented and documented, off by default.
- **Evidence:** `infra/terraform/modules/dns/main.tf:6-26` (design and the one-time destructive replace on enabling), `infra/terraform/modules/dns/variables.tf:37-44` (`enable_failover` and the secondary target)
- **Status:** Satisfied as an opt-in. Enabling it needs a real secondary target (maintenance page or recovery-region ALB), which is not provisioned here.

## #1323 — rollback.sh scope

- **Resolution:** The script states what it does and does not roll back, including Terraform.
- **Evidence:** `infra/scripts/rollback/rollback.sh:3-29` (scope, exclusions), `:52-59` (`--target app|terraform|all`, `--dry-run`, `--plan`)
- **Status:** Satisfied. Terraform rollback works only from a saved plan file, as the header explains.

## #1324 — healthcheck.sh exit codes

- **Resolution:** Failures return non-zero and misuse returns a distinct code.
- **Evidence:** `infra/scripts/healthcheck.sh:121-145` (`exit 2` for tooling/misuse, `exit 1` when any check fails, `exit 0` otherwise), `:15` (`--require`)
- **Status:** Satisfied.

