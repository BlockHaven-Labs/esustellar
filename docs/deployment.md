# Deployment & Scripts Process

## Overview
# Reference: Issue #536
```
Developer Push → GitHub Actions → Build → Deploy → Smoke Test → Log Archiving
```

## Prerequisite: Terraform Remote State

Before deploying infrastructure with Terraform, bootstrap the remote state backend:
```bash
cd infra/terraform/state-bootstrap
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS region and bucket name
terraform init
terraform apply
```

This creates an S3 bucket (with versioning and encryption) and a DynamoDB table for state locking. Downstream Terraform roots use this remote backend; those with a partial `backend "s3" {}` block need `terraform init -backend-config=backend/<env>.hcl`.

## Step-by-Step

### 1. Build Contracts

```bash
cd contracts/savings && stellar contract build
cd ../registry && stellar contract build
```

### 2. Deploy to Testnet

Using the deployment script:

```bash
./deploy.sh
```

`deploy.sh` automatically:
1. Builds both Registry and Savings contracts
2. Sets up identity and funds deployer
3. Deploys contracts to Stellar Testnet
4. Updates `apps/web/.env.local` and `deployment-info.json`
5. Runs the post-deploy contract smoke tests automatically

---

## 🧪 Post-Deploy Smoke Testing

After deployment, verify that contract functions are responding properly on-chain:

```bash
# Run via npm script
npm run smoke-test

# Or run directly with parameters
./scripts/post-deploy-smoke-test.sh \
  --registry <REGISTRY_CONTRACT_ID> \
  --savings <SAVINGS_CONTRACT_ID> \
  --network testnet
```

The smoke test verifies core endpoints on both contracts:
- `Registry`: `get_group_count`, `get_all_groups`, `get_all_public_groups`
- `Savings`: `get_all_groups`

---

## 📦 Contract Event Log Archiving

To query Stellar Horizon/Soroban RPC for contract events since the last run and append them to a local JSONL archive:

```bash
# Run via npm script
npm run export-events

# Or run directly with options
./scripts/export-contract-events.sh \
  --output logs/contract-events.jsonl \
  --checkpoint logs/.event_checkpoint.json
```

Outputs:
- Archive file: `logs/contract-events.jsonl`
- Checkpoint file: `logs/.event_checkpoint.json`

---

## 4. Docker Build & Push

```bash
docker build -t ghcr.io/blockhaven-labs/esustellar-web:latest .
docker push ghcr.io/blockhaven-labs/esustellar-web:latest
```

The Kubernetes manifests pull this web image from GHCR. The Terraform ECR
module defines separate AWS ECR repositories, but no current Terraform root
instantiates it, and no workflow builds or publishes images to those
repositories. The balance-exporter also has no configured image-publishing
destination.

## 4a. Rollout, then invalidate the CDN cache

**This step is mandatory after every deploy and is not optional.** See #1113.

```bash
# 1. Roll out the new image and wait for it to become ready first.
kubectl -n esustellar rollout status deployment/esustellar-web --timeout=10m

# 2. Only then invalidate the CloudFront cache.
bash infra/scripts/invalidate-cdn-cache.sh \
  --distribution-id "$(terraform -chdir=infra/terraform output -raw distribution_id)" \
  --paths '/*' \
  --wait
```

The script performs the rollout gate itself, so step 1 is belt-and-braces when
it is run locally by hand.

### Why the ordering matters

The CDN caches assets with `default_ttl 3600` and `max_ttl 86400`
(`infra/terraform/modules/cdn/main.tf`). A deploy ships new content-hashed
asset filenames, but it does not change the URLs of paths that are already
cached, so the previous build's assets remain served at the edge — for up to 24h
on any path that a cached HTML document or a third party links to directly. The
symptom is a mixed build in production: new HTML referencing hashed assets some
edge locations still serve from cache, or the reverse.

**Invalidating before the rollout finishes makes this worse**, not better: edge
locations refetch from pods that are still serving the old build and cache the
old assets again. Always wait for `rollout status` to report completion.

The CI/CD role already holds `cloudfront:CreateInvalidation`, scoped to this
project's distribution (`infra/terraform/modules/iam/main.tf`), so no IAM change
is required. The CDN module's `invalidation_required` output declares whether an
environment expects this step, and `invalidation_command` emits the exact command
so no distribution id needs to be hardcoded in a pipeline.

A single `/*` invalidation is one path, which is inside the 1000 free paths per
month. Do not loop over individual asset paths.

## 5. Production Deploy

```bash
ssh <production-host>
cd /opt/esustellar
docker compose pull
docker compose up -d
```

## Rollback

```bash
docker compose down
docker compose pull <previous-tag>
docker compose up -d
```

A k8s rollout is rolled back with `infra/scripts/rollback/rollback.sh`, which
covers both the application layer and Terraform applies — see the scope block at
the top of that script for what it does **not** cover.

If the rollback is a deploy rather than a config revert, remember the CDN cache
invalidation step in §4a: a rolled-back build is subject to exactly the same
staleness as a rolled-forward one.

## CI Pipeline

There is currently no committed Docker image publishing workflow. Build and
push the GHCR image manually as shown above; the `docker-ci.yml` workflow
referenced in earlier revisions is not present.
