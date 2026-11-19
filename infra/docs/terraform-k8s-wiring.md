# Terraform outputs to Kubernetes wiring (#1306)

## Current state

| Terraform value | Exposed as | Consumer today | Wired automatically? |
|---|---|---|---|
| Shared VPC id | `vpc_id` | documentation / manual reference | No |
| Private subnet ids | `private_subnet_ids` | ECS/Fargate planning only | No |
| Storage KMS key | `kms_key_arn` (sensitive) | IAM module input inside the root | Yes, inside Terraform |
| Backup bucket name / URI | `backups_bucket`, `backups_bucket_uri` | `infra/backups/backup-indexer.sh`, `backup-verify.sh` via shell variables | Partly: exported by Terraform, consumed by scripts, not by k8s manifests |
| ECR repository URLs | `module.ecr.repository_urls` | none | **No** |
| Web image | not a Terraform output | literal string in k8s manifests | **No** |

The web Deployment image is a literal in both manifest trees:

```
ghcr.io/blockhaven-labs/esustellar-web:<tag>
```

`infra/terraform/modules/ecr` can expose `repository_urls`, but no Terraform
root instantiates the module and no workflow publishes to it (see
`infra/terraform/README.md`). There is therefore no automated step in which a
Terraform-managed ECR URI is substituted into a k8s `image:` field today. The
registry-name mismatch historically observed between `k8s/` and `infra/k8s/`
was plain manifest drift, not a half-wired Terraform output.

## Why this is currently safe

- GHCR is the only registry with a documented publication path.
- `infra/scripts/validate-image-references.sh` fails when any web manifest
  names a different repository; it runs in `k8s-overlay-validation.yml`.
- Overlays pin tags via Kustomize `images:`; tags are environment-specific and
  intentional, so a shared repository name is the invariant to enforce.

## If ECR becomes the publish target

Wire it deliberately, in this order, instead of hand-editing manifest images:

1. Instantiate `module.ecr` in each root that owns images, with
   `image_tag_mutability = "IMMUTABLE"` and `scan_on_push = true`.
2. Export the URLs from the root (`output "ecr_repository_urls"`) and read them
   with `terraform output -json` in the deploy job.
3. Set the Kustomize image name from that output:
   `kustomize edit set image ghcr.io/blockhaven-labs/esustellar-web=<repo-url>`
   in a temporary render directory — never rewrite committed overlays with a
   generated account-specific hostname.
4. Publish by immutable git-SHA tag, update the validation script's canonical
   repository, and remove the GHCR documentation from
   `infra/terraform/README.md` / `infra/k8s/README.md`.
5. Confirm `terraform output` is available to the deploy job before applying;
   a missing output must fail the deploy rather than silently fall back to
   `:latest`.

Until those steps exist, treat the ECR repositories as reserved names only.
