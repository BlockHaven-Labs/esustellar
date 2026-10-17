# Regional Outage Disaster Recovery Runbook

**Scope:** A full regional AWS outage in `us-east-1` affecting all Terraform-provisioned infrastructure (Terraform remote state backend, VPC, NAT gateways, ECR, CloudFront/CDN origin, Route53/DNS, and Kubernetes/workload compute).

---

## 1. Context & Architecture Analysis

`infra/terraform/backend.tf` and `infra/terraform/backend/*.hcl` pin remote state storage to S3 bucket `esustellar-terraform-state` and DynamoDB lock table `esustellar-terraform-locks` in `us-east-1`. Furthermore, AWS VPC, ECR, and storage resources are provisioned in `us-east-1` without automated cross-region active-active replication.

### Blast Radius & User Funds Assessment
- **Smart Contract & User Funds State (`contracts/savings`):**
  - All financial state (group savings deposits, member contribution history, round states, rotational payouts, and token custody via SEP-41 token contracts) resides **on-chain on the Stellar blockchain network**, validated independently by decentralized Soroban RPC nodes and Horizon validators.
  - **User funds are NOT held in AWS databases or S3 buckets.**
  - An AWS regional outage in `us-east-1` **cannot** compromise, delete, or freeze on-chain balances or contract storage.
  - If the web frontend is unavailable due to an AWS outage, users can interact with contracts directly via the Stellar CLI, alternative frontends/interfaces, or external wallets (Freighter, LOBSTR) targeting non-AWS Soroban RPC nodes.
- **Affected AWS Infrastructure Components:**
  - **Terraform Remote State:** `us-east-1` S3 bucket & DynamoDB lock table.
  - **Networking (`infra/terraform/modules/vpc`):** VPC, subnets, Internet Gateways, NAT gateways, and Security Groups.
  - **Container Registry (`infra/terraform/modules/ecr`):** Repository images for web frontend and balance-exporter.
  - **Edge / CDN (`infra/terraform/modules/cdn`):** CloudFront edge caches remain active globally for cached static assets, but cache misses and dynamic origin requests to the ALB in `us-east-1` fail.
  - **Application Workloads (`infra/k8s`):** Web frontend pods and monitoring services.
  - **Off-chain Indexer & Backups (`infra/backups`):** Database of off-chain indexed events.

---

## 2. Disaster Recovery Targets

| Metric | Target | Rationale & Scope |
|---|---|---|
| **RTO (Recovery Time Objective)** | **4 hours** | Time to provision secondary regional infrastructure in `us-west-2` via Terraform and redirect DNS to restore public web UI access. (Direct RPC/contract access has an RTO of 0 min since Stellar mainnet/testnet remains operational). |
| **RPO (Recovery Point Objective) - User Funds & Contract State** | **0** | Stellar blockchain state is immutable and unaffected by AWS regional outages. No transaction or deposit data is lost. |
| **RPO (Recovery Point Objective) - Off-Chain Indexer** | **15 minutes** | Bounded by the scheduled database snapshots executed via `infra/backups/backup-indexer.sh`. The indexer can also replay missed blocks directly from Soroban RPC. |
| **RPO (Recovery Point Objective) - Cloud Infrastructure State** | **0 (GitOps)** | All Terraform configurations, Kubernetes Kustomize manifests, and environment templates are versioned in Git. |

---

## 3. Pre-Requisites & Secondary Region Architecture

- **Secondary Region:** `us-west-2` (US West - Oregon).
- **Tooling:** Terraform >= 1.6, AWS CLI v2 configured with admin credentials/role, `kubectl`, `stellar` CLI.
- **Git Repository:** Clean checkout of the `main` branch.
- **Cross-Region Replication Strategy:**
  - S3 bucket versioning is enabled on Terraform state and backup buckets.
  - Secondary backend configuration file: `infra/terraform/backend/<env>-dr.hcl`.

---

## 4. Step-by-Step Recovery Procedure

### Phase 1: Incident Triage & Public Status (0 - 30 minutes)
1. **Verify Outage Scope:**
   - Confirm AWS Health Dashboard reports widespread service disruption in `us-east-1`.
   - Verify external Soroban RPC health:
     ```bash
     curl -s https://soroban-testnet.stellar.org/health | jq .
     ```
   - Confirm user funds are secure on-chain using Stellar CLI:
     ```bash
     stellar contract invoke --id <SAVINGS_CONTRACT_ID> --network testnet -- get_all_groups
     ```
2. **Post Incident Communication:**
   - Post notice to status page and community channels: *“AWS us-east-1 regional disruption identified. Smart contracts and user funds on Stellar remain unaffected. Executing DR runbook to restore web interface in us-west-2.”*

### Phase 2: Secondary Region State Backend Bootstrap (30 - 60 minutes)
1. If the primary state bucket in `us-east-1` is unreachable, initialize a secondary state bucket in `us-west-2`:
   ```bash
   export DR_REGION="us-west-2"
   export ENVIRONMENT="testnet" # or mainnet

   aws s3api create-bucket \
     --bucket "esustellar-terraform-state-dr-${DR_REGION}" \
     --region "$DR_REGION" \
     --create-bucket-configuration LocationConstraint="$DR_REGION"

   aws dynamodb create-table \
     --table-name "esustellar-terraform-locks-dr" \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region "$DR_REGION"
   ```
2. If replicating from local/secondary state backup:
   ```bash
   terraform -chdir=infra/terraform init \
     -backend-config="bucket=esustellar-terraform-state-dr-${DR_REGION}" \
     -backend-config="region=${DR_REGION}" \
     -backend-config="dynamodb_table=esustellar-terraform-locks-dr" \
     -backend-config="key=infra/terraform/${ENVIRONMENT}/terraform.tfstate" \
     -reconfigure
   ```

### Phase 3: Terraform Infrastructure Spin-Up in Secondary Region (60 - 150 minutes)
1. Apply Terraform modules with `aws_region` overridden to `us-west-2`:
   ```bash
   terraform -chdir=infra/terraform plan \
     -var="aws_region=us-west-2" \
     -var="environment=${ENVIRONMENT}" \
     -out=dr-plan.tfplan

   terraform -chdir=infra/terraform apply dr-plan.tfplan
   ```
2. Terraform provisions:
   - VPC, subnets, and NAT Gateways in `us-west-2`.
   - ECR repositories (`esustellar-web`, `savings`, `registry`).
   - S3 storage & backups buckets.
   - ALB and target groups.

### Phase 4: Container Images & Workload Deployment (150 - 200 minutes)
1. **Rebuild / Push Web Containers to Secondary ECR:**
   - Authenticate Docker to `us-west-2` ECR:
     ```bash
     aws ecr get-login-password --region us-west-2 | \
       docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-west-2.amazonaws.com"
     ```
   - Build and push web application image from root:
     ```bash
     docker build -t esustellar-web:dr -f apps/web/Dockerfile .
     docker tag esustellar-web:dr "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-west-2.amazonaws.com/esustellar-${ENVIRONMENT}-esustellar-web:latest"
     docker push "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-west-2.amazonaws.com/esustellar-${ENVIRONMENT}-esustellar-web:latest"
     ```
2. **Deploy Workloads to Kubernetes:**
   - Update Kube context to the secondary regional cluster.
   - Apply canonical Kustomize manifests:
     ```bash
     kubectl kustomize infra/k8s/overlays/${ENVIRONMENT} | kubectl apply -f -
     ```
   - Verify pod rollout:
     ```bash
     kubectl rollout status deployment/esustellar-web -n esustellar
     ```

### Phase 5: Off-Chain Indexer Restoration (200 - 220 minutes)
1. Restore database from the most recent snapshot in S3:
   ```bash
   # Download latest backup
   aws s3 cp s3://esustellar-${ENVIRONMENT}-backups/indexer/latest.sql.gz /tmp/latest.sql.gz
   gunzip /tmp/latest.sql.gz
   psql -h "$DR_DB_HOST" -U "$DB_USER" -d esustellar_indexer -f /tmp/latest.sql
   ```
2. Start indexer process to replay any ledgers missed between the snapshot and current block:
   ```bash
   kubectl rollout restart deployment/indexer -n esustellar
   ```

### Phase 6: Traffic Cutover & Validation (220 - 240 minutes)
1. **Update CloudFront / Route53 DNS:**
   - Point Route53 alias records to the new ALB endpoint in `us-west-2`.
   - Or update CloudFront distribution origin to `us-west-2` ALB.
2. **Run Post-Recovery Smoke Tests:**
   ```bash
   npm run smoke-test
   ```
3. **Verify Contract Interactivity:**
   - Confirm group listings and savings contract balances load accurately in the web frontend.

---

## 5. Post-Incident & Fallback Procedure

Once `us-east-1` recovers:
1. Do not fail back immediately; ensure `us-east-1` service stability for at least 4 hours.
2. Take a snapshot of the `us-west-2` indexer database.
3. Migrate Terraform state and database records back to the primary region during a scheduled maintenance window.
4. Review post-mortem and evaluate S3 Cross-Region Replication (CRR) for state buckets and automated multi-region Terraform CI execution.
