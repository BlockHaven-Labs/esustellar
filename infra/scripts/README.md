# infra/scripts

Index of the operational scripts in this directory: what each one does and when to run it.

| Script | Purpose | When to run |
| --- | --- | --- |
| `healthcheck.sh` | Pings the web app, Horizon RPC, and monitoring endpoints; prints a PASS/FAIL summary and exits 1 on any failure. | On demand, or wired into an uptime/alerting job. |
| `smoke-test.sh [testnet\|mainnet]` | Post-deploy smoke test — verifies deployed contracts are reachable and return expected results. | Immediately after every deploy. |
| `backup-verify.sh` | Downloads the most recent backup from S3 and verifies it isn't truncated/corrupted. | Independently of `backup-indexer.sh` (e.g. daily, shortly after the backup job runs) — not inline with upload. |
| `rotate-deployer-keypair.sh [network]` | Rotates the Stellar deployer keypair without downtime: generates a new keypair, funds/verifies it, writes credentials to a restricted file, retains the old key for 24h as a rollback safety net. | On a scheduled rotation cadence, or immediately if the current deployer key is suspected compromised. Requires updating the `DEPLOYER_SECRET_KEY` CI/CD secret afterward. |
| `validate-infra-env.sh` | Validates the current shell environment against the variable names listed in `infra/secrets/templates/.env.example`. | Before running any script or deploy step that depends on infra secrets being present locally. |
| `validate-k8s-manifests.sh` | Builds every `infra/k8s` overlay with kustomize and checks the output against the Kubernetes schema with kubeconform. | Before applying k8s manifest changes; intended to be wired into CI once tool availability is confirmed there. |
| `check-secret-rotation.py` | Checks `infra/secrets/last-rotated.yml` against each secret's rotation policy and flags any that are overdue. | On a schedule (e.g. weekly CI job) to catch missed rotations. |
| `deploy/validate-env.sh` | Validates only the web-frontend (`NEXT_PUBLIC_*`) environment variables. Companion to `validate-infra-env.sh`, which covers everything else. | Before a frontend deploy. |
| `rollback/rollback.sh` | Rolls back the most recent deployment. | When a post-deploy smoke test or healthcheck fails and the deploy needs to be reverted. |

## Adding a new script

Give it a one-line purpose comment at the top of the file (most scripts here already do), and add a row to the table above describing its purpose and when to run it.
