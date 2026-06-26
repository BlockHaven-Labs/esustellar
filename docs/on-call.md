# On-Call Rotation & Escalation

## Rotation Schedule

- **Duration**: 1 week per rotation
- **Team size**: Minimum 3 engineers
- **Handoff**: Every Monday at 09:00 UTC

## Responsibilities

- Monitor Stellar RPC health
- Respond to deployment failures
- Triage contract runtime issues
- Handle infrastructure alerts

## Escalation Path

```
Level 1 (On-Call Engineer) ── resolve within 30 min
        │ (if unresolved)
Level 2 (Senior Engineer)  ── resolve within 2 hrs
        │ (if unresolved)
Level 3 (Lead / Architect) ── resolve within 8 hrs
```

## Communication

- **PagerDuty** or **OpsGenie** for alerts
- **#infra-alerts** Slack channel for notifications
- **Post-incident**: Document in `docs/incident-response.md`

## Testnet vs Mainnet

- **Testnet**: Follow-the-sun, best-effort response within 4 hrs
- **Mainnet**: 24/7 coverage, 30-min SLA for critical issues
