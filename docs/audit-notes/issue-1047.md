# Issue #1047: rollback.sh dry-run mode

**File audited:** `infra/scripts/rollback/rollback.sh`

## Finding
No `--dry-run` flag currently exists, so an operator cannot preview a
rollback's target revision/affected resources before committing.

## Recommendation
Add a `--dry-run` flag that runs the same target-resolution logic and
prints the target revision and affected resources, then exits without
calling `kubectl rollout undo` / `helm rollback`.

## Follow-up
Implement the flag in a focused follow-up diff to `rollback.sh`, since
it touches the script's core control flow and deserves its own
reviewed change.
