#!/bin/bash

# Setup Branch Protection Rules for Main Branch
# This script uses GitHub CLI to configure branch protection rules
# Usage: ./scripts/setup-branch-protection.sh

set -e

REPO="${GITHUB_REPO:-BlockHaven-Labs/esustellar}"
BRANCH="main"

echo "Setting up branch protection for $REPO/$BRANCH"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "Configuring branch protection rules..."

# Configure branch protection using GitHub CLI
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$REPO/branches/$BRANCH/protection" \
  -f required_status_checks='{
    "strict": true,
    "contexts": [
      "Docker CI / build",
      "E2E Status Gate"
    ],
    "checks": [
      {
        "context": "Docker CI / build",
        "app_id": null
      },
      {
        "context": "E2E Status Gate",
        "app_id": null
      }
    ]
  }' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false,
    "required_approving_review_count": 1
  }' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_conversation_resolution=false \
  -f lock_branch=false \
  -f allow_fork_syncing=false

echo "✅ Branch protection rules configured successfully!"
echo ""
echo "Summary of rules applied:"
echo "  - Required status checks: Docker CI / build, E2E Status Gate"
echo "  - Strict mode: enabled (branches must be up-to-date)"
echo "  - Required approving reviews: 1"
echo "  - Dismiss stale reviews: enabled"
echo "  - Force pushes: disabled"
echo "  - Deletions: disabled"
echo "  - Admin enforcement: enabled"
