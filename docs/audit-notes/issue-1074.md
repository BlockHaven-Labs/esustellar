# Issue #1074: staging vs testnet README parity

**Files audited:** `environments/staging/README.md`,
`environments/testnet/README.md`

## Finding
Compared structure and depth of both READMEs' prerequisites and setup
steps.

## Recommendation
Bring both READMEs to the same structure (Prerequisites, Setup,
Configuration, Troubleshooting sections in the same order) so neither
environment is documented in less detail purely because it was
written second.

## Follow-up
Apply the structural alignment in a focused follow-up diff once the
canonical section order is agreed.
