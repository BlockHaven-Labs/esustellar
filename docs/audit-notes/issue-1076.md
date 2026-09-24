# Issue #1076: three example-env files, no documented relationship

**Files audited:** `.env.example`, `infra/secrets/templates/.env.example`,
`environments/testnet/config/secrets.example`

## Documented relationship
- `.env.example` (top-level) — app-level local dev defaults.
- `infra/secrets/templates/.env.example` — infra-level config template
  for deployment tooling.
- `environments/testnet/config/secrets.example` — testnet-specific
  overrides layered on top of the infra template.

## Follow-up
Cross-link this note from each of the three files in a focused
follow-up diff so a new contributor finds it from any of them.
