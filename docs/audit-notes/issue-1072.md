# Issue #1072: environments/staging/terraform.tfvars audit

**File audited:** `environments/staging/terraform.tfvars`

## Finding
Reviewed the committed values: region identifiers, instance sizing,
and resource tags only. No database passwords, API keys, private
keys, or other secret material are present in this file.

## Decision
Safe to keep committed as-is. No secrets were found.

## Follow-up
Add a pre-commit secret-scan hook (see `.pre-commit-config.yaml`) so
future edits to any `*.tfvars` file are checked automatically before
this kind of audit becomes necessary again.
