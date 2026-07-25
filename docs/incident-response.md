# Incident Response Playbook

## Severity Levels

| Severity | Definition | Response Time |
|---|---|---|
| P0 | Service down / users blocked | 15 min |
| P1 | Major feature broken | 30 min |
| P2 | Minor issue / non-critical | 4 hrs |
| P3 | Cosmetic / enhancement | Next sprint |

## Response Steps

### 1. Detect
- Monitor GHCR, Stellar RPC health, and deployment pipeline
- Alerts via on-call rotation

### 2. Triage
```
Is it a contract issue? → Check Stellar expert explorer
Is it a frontend issue? → Check Vercel/Fargate logs
Is it an infra issue?  → Check Docker / VM logs
```

### 3. Mitigate
- **Contract revert**: Roll back to previous deploy
- **RPC outage**: Switch to fallback endpoint
- **Auth failure**: Rotate secrets, restart services

### 4. Resolve
- Apply hotfix via PR
- Deploy to testnet first, verify, then production

### 5. Postmortem
- File an issue documenting root cause
- Add regression test / monitoring
- Update this playbook

## Communication

- Notify on-call via PagerDuty
- Post status in `#infra-alerts`
- For P0, update the GitHub issue within 30 min
