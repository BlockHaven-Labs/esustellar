# GitHub Actions Secrets

This document lists all secrets that must be configured in the repository
**Settings → Secrets and variables → Actions** before CI/CD workflows will work.

## Required Secrets

| Secret Name | Description | Example / Where to find it |
|---|---|---|
| `DEPLOYER_SECRET_KEY` | Stellar deployer account secret key (S…) | Generated with `stellar keys generate deployer` |
| `VERCEL_TOKEN` | Vercel personal access token for frontend deploys | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organisation / team ID | Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel project settings |
| `GHCR_PAT` | GitHub Personal Access Token with `write:packages` scope for GHCR pushes | GitHub → Settings → Developer settings → PATs |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for deploy notifications (optional) | Slack app configuration |

## Setup Instructions

1. Navigate to the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** for each entry in the table above.
4. Paste the value and save.

## Rotating Secrets

- **DEPLOYER_SECRET_KEY**: Run `infra/scripts/deploy/validate-env.sh` after rotation to confirm the new key is picked up.
- **VERCEL_TOKEN**: Revoke the old token in the Vercel dashboard before adding the new one.
- **GHCR_PAT**: Ensure the new token retains the `write:packages` and `read:packages` scopes.

## Local Development

Copy `.env.example` to `.env` and fill in values. Never commit `.env` or raw secret values.
