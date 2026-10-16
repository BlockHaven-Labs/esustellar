# Issue #1278: environments/staging/terraform.tfvars contents

**File audited:** `environments/staging/terraform.tfvars`

## Finding
The committed file holds five non-sensitive values only:
`namespace`, `kube_context`, `web_replicas`, `stellar_network` and
`soroban_rpc_url` (a public Soroban testnet endpoint). It contains no
passwords, API keys, tokens or private keys.

## Guidance
- Keep it that way: secrets belong in `infra/secrets/`, never in `.tfvars`.
- Any future sensitive variable should be marked `sensitive = true` in
  `variables.tf` and supplied via `TF_VAR_*` environment variables.
