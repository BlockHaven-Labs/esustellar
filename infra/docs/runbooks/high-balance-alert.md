# On-Call Runbook: Critical Alerts

This runbook covers triage and resolution steps for all critical alerts in the esustellar monitoring stack.

---

## Alert: Web App Down

**Trigger**: `probe_success == 0` for the web app URL for > 2 minutes.

**Triage**:
1. Check pod/container status: `kubectl get pods -n esustellar` or `docker ps`.
2. Check app logs: `kubectl logs -n esustellar deploy/esustellar-web`.
3. Check Horizon RPC connectivity: `bash infra/scripts/healthcheck.sh`.

**Resolution**:
- If crash-loop: inspect logs for uncaught exceptions; redeploy with `docker compose up -d` or Vercel re-deploy.
- If OOM: increase container memory limits in `docker-compose.yml` or k8s manifests.

---

## Alert: Deployer Balance Low

**Trigger**: Stellar deployer account balance < 10 XLM.

**Triage**:
1. Run `bash scripts/check-deployer-balance.sh`.
2. Confirm account on Stellar Expert.

**Resolution**:
- Fund the deployer account via friendbot (testnet) or a manual transfer (mainnet).
- After funding, re-run the balance check to confirm.

---

## Alert: Contract Invocation Failure Rate High

**Trigger**: Error rate on contract invocations exceeds 5% over 5 minutes.

**Triage**:
1. Check Horizon responses in app logs for error codes.
2. Verify contract IDs in `deployment-info.json` match `apps/web/.env.local`.

**Resolution**:
- If contract IDs are stale: run `bash infra/scripts/rollback/rollback.sh testnet`.
- If Horizon is down: switch the RPC endpoint in the app config and redeploy.

---

## Escalation

If the issue cannot be resolved within 30 minutes, escalate to the on-call engineering lead and open an incident in the project tracker.
