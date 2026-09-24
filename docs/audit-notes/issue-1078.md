# Issue #1078: workload cost visibility gap

**File audited:** `.github/workflows/infracost.yml`

## Finding
Infracost currently estimates only the AWS resources Terraform
provisions directly (VPC, S3, KMS, ACM, CloudFront, ECR, Route53). It
does not estimate the cost of the workloads actually running inside
the cluster (mainnet 3 replicas, staging 2, testnet 1 per the k8s
overlays).

## Recommendation
Add a lightweight workload-cost estimate step (e.g. summing
requested CPU/memory per overlay times an hourly on-demand rate) as a
separate job, or evaluate a dedicated Kubernetes cost tool
(OpenCost/Kubecost) rather than extending Infracost itself, since
Infracost's Kubernetes support is limited to Terraform-managed
resources.

## Follow-up
Prototype the workload-cost job in a dedicated PR once a tool choice
is agreed.
