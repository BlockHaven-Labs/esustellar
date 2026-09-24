# Issue #1054: dependabot.yml ecosystem coverage

**File audited:** `.github/dependabot.yml`

## Finding
Reviewed the configured `package-ecosystem` entries against the full
dependency surface. Terraform providers (`infra/terraform/`,
`infra/testnet/`, `environments/*/`) and Docker base images (top-level
`Dockerfile`, `monitoring/balance-exporter/Dockerfile`) are an
equally real source of security debt as JS/Rust app dependencies.

## Recommendation
Add `package-ecosystem: "terraform"` and `package-ecosystem: "docker"`
entries covering the directories above, alongside the existing
npm/cargo entries.

## Follow-up
Apply the two new ecosystem blocks in a focused follow-up diff to
`.github/dependabot.yml`.
