# Audit verification: Promtail secret redaction, PodDisruptionBudget, securityContext and Service type

Records, for each issue below, where the requested behaviour exists in the repository, so the audit trail is explicit.
Evidence is `file:line` as of the commit this document was written against. It was gathered by reading files and searching, **not** by running Terraform, rendering manifests, or running the repo's validation scripts. Re-check line numbers after later edits.

## #1313 — Promtail excludes secret-adjacent log lines

- **Resolution:** Promtail redacts Stellar secret keys (and other secret-like strings) before they reach Loki.
- **Evidence:** `infra/monitoring/promtail/promtail-config.yaml:1` (header), `:45-48` (`S[A-Z2-7]{55}` replaced with `[REDACTED_STELLAR_SECRET]`), `:52-59` (further redaction stages)
- **Status:** Satisfied. The file itself notes redaction is defense in depth; the real control is not printing secrets.

## #1314 — PodDisruptionBudget for esustellar-web

- **Resolution:** A PDB exists in the base.
- **Evidence:** `infra/k8s/base/pdb.yaml:33` (`maxUnavailable: 1`); rationale for `maxUnavailable` over `minAvailable` at `:11-16`; render check in `.github/workflows/k8s-overlay-validation.yml`
- **Status:** Satisfied. The issue suggested `minAvailable: 1`; `maxUnavailable: 1` was chosen so a one-replica testnet is not blocked from draining.

## #1315 — securityContext on the web deployment

- **Resolution:** Pod and container security contexts are set.
- **Evidence:** `infra/k8s/base/deployment.yaml:23` (`runAsNonRoot: true`), `:40` (`allowPrivilegeEscalation: false`), `:42` (`readOnlyRootFilesystem: true`), `:46` (writable-path notes)
- **Status:** Satisfied.

## #1316 — Service is ClusterIP

- **Resolution:** The Service is `ClusterIP` and the file explains why it must stay that way.
- **Evidence:** `infra/k8s/base/service.yaml:23` (`type: ClusterIP`) with rationale above it
- **Status:** Satisfied.

