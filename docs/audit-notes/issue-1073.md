# Issue #1073: environments/testnet/.gitignore audit

**File audited:** `environments/testnet/.gitignore`

## Finding
Compared against the repository root `.gitignore`. The root file
excludes local env/secret files and compose overrides broadly; the
testnet-scoped file should be at least as strict for anything created
under `environments/testnet/`.

## Decision
Recommend the testnet `.gitignore` explicitly include:
- `docker-compose.override.yml`
- `config/secrets.local*`
- any filled-in copy of `config/secrets.example`

## Follow-up
Apply the three entries above in a focused follow-up diff to
`environments/testnet/.gitignore`.
