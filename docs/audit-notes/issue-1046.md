# Issue #1046: rollback.sh environment awareness

**File audited:** `infra/scripts/rollback/rollback.sh`

## Finding
Reviewed for environment-safety. Recommend the script should require
an explicit `--env mainnet|staging|testnet` argument and verify that
the current `kubectl` context matches the requested environment
before proceeding, rather than trusting whatever context happens to
be active.

## Recommendation
```
[[ "$(kubectl config current-context)" == *"$ENV"* ]] || {
  echo "kubectl context does not match --env=$ENV, aborting"; exit 1;
}
```

## Follow-up
Apply the explicit-arg + context-check guard in a focused follow-up
diff to `rollback.sh`.
