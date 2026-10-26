# Issue #1284: K8s workload cost visibility in CI

**Files changed:**
- `.github/workflows/infracost.yml`
- `scripts/k8s-cost-estimate.sh` *(new)*

## Finding

The existing `infracost.yml` workflow estimated costs for the AWS resources
Terraform provisions (VPC, S3, KMS, ACM, CloudFront, ECR, Route53) but
provided no visibility into the compute cost of the workloads running inside
the EKS/ECS cluster. With three environments at different replica counts
(mainnet 3, staging 2, testnet 1) the monthly workload cost was entirely
invisible during code review.

## Resolution

### `scripts/k8s-cost-estimate.sh`

A new shell script reads:

- **Resource requests/limits** from `infra/k8s/base/deployment.yaml`
- **Replica counts** from each environment's kustomize overlay (`count:`
  field under `replicas:`)

It computes per-environment lower (requests) and upper (limits) monthly cost
bounds using AWS EKS Fargate on-demand unit prices as a publicly-known
reference baseline:

| Unit | Reference price |
|---|---|
| vCPU-hour | $0.04480 (us-east-1 Fargate on-demand) |
| GB-RAM-hour | $0.00491 |

Prices are overridable via `CPU_PRICE_PER_VCPU_HOUR` / `MEM_PRICE_PER_GB_HOUR`
environment variables. The script also supports `--json` output for machine
consumption.

Sample output at current resource settings (100 m / 128 Mi requests,
500 m / 512 Mi limits):

| Environment | Replicas | Lower bound | Upper bound |
|---|---|---|---|
| mainnet | 3 | ~$11.16/mo | ~$54.43/mo |
| staging | 2 | ~$7.44/mo | ~$36.29/mo |
| testnet | 1 | ~$3.72/mo | ~$18.14/mo |
| **Total** | — | **~$22.32/mo** | **~$108.86/mo** |

### `.github/workflows/infracost.yml`

The workflow now triggers on `infra/k8s/**` and `scripts/k8s-cost-estimate.sh`
changes in addition to `infra/terraform/**`. A second job (`k8s-workload-cost`)
runs the script, writes the Markdown table to `$GITHUB_STEP_SUMMARY`, and
upserts a single PR comment (identified by an HTML marker comment) so
subsequent pushes replace rather than accumulate comments.

Both jobs are **advisory only** — neither is a required status check, matching
the precedent set in #1258.

## Guidance

- Update `CPU_PRICE_PER_VCPU_HOUR` / `MEM_PRICE_PER_GB_HOUR` in the workflow
  env block if the project moves to a different cloud provider or region.
- The script has no runtime dependencies beyond `bash`, `grep`, `sed`, and
  `awk`; it is safe to run locally and in any CI environment.
- If resource requests or limits change in `infra/k8s/base/deployment.yaml`,
  the script picks them up automatically on the next PR.
