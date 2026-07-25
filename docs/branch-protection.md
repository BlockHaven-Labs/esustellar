# Branch Protection Rules for Main

This document describes the branch protection rules enforced on the `main` branch for the esustellar repository.

## Required Status Checks

The following GitHub Actions workflows must pass before any PR can be merged to `main`:

### 1. Docker CI
- **Workflow**: `.github/workflows/docker-ci.yml`
- **Job**: `build`
- **Purpose**: Validates Docker image builds for multi-architecture (linux/amd64, linux/arm64)
- **Triggers**: Runs on every push to `main` and every PR targeting `main`

### 2. E2E Status Gate
- **Workflow**: `.github/workflows/e2e.yml`
- **Job**: `e2e-status`
- **Purpose**: Ensures all critical E2E test suites pass before merge
- **Critical suites covered**:
  - `auth` — wallet connect / session persistence
  - `group-creation` — group creation wizard
  - `contribution` — make contribution flow
  - `payout` — payout schedule & request payout
- **Triggers**: Runs on every push to `main` and every PR targeting `main` (when mobile/packages paths change)

### 3. CodeQL Analysis
- **Workflow**: `.github/workflows/codeql.yml`
- **Job**: `analyze`
- **Purpose**: Static analysis for security vulnerabilities and code quality issues in TypeScript and Rust
- **Languages analyzed**:
  - TypeScript (mobile app, web app, SDK, shared packages)
  - Rust (smart contracts for registry and savings)
- **Triggers**: Runs on every push to `main`/`develop`, every PR targeting `main`/`develop`, and weekly on Sundays
- **Note**: Findings should be reviewed and triaged before mainnet launch. See `docs/codeql-security.md` for details.

## Protection Rules

### Required Before Merging
- **Status checks**: All required checks must pass (see above)
- **Pull request reviews**: At least 1 approval required
- **Review dismissal**: Dismiss stale PR approvals when new commits are pushed
- **Code owner review**: Require approval from code owners for files that have them

### Restrictions
- **Force pushes**: Disallowed
- **Deletions**: Branch cannot be deleted
- **Linear history**: Require branches to be up to date before merging (optional, recommended)

## Setup Instructions

### Automated Setup (Recommended)

Use the provided automation scripts to configure branch protection rules:

**Linux/macOS:**
```bash
./scripts/setup-branch-protection.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\setup-branch-protection.ps1
```

These scripts require GitHub CLI (`gh`) to be installed and authenticated.

### Manual Setup

To configure these rules manually in GitHub:

1. Navigate to **Settings** → **Branches** → **Branch protection rules**
2. Click **Add rule**
3. Configure as follows:
   - **Branch name pattern**: `main`
   - **Require status checks to pass before merging**: ✅
     - Add: `Docker CI / build`
     - Add: `E2E Status Gate`
   - **Require branches to be up to date before merging**: ✅ (recommended)
   - **Require pull request reviews before merging**: ✅
     - **Required approving reviews**: 1
     - **Dismiss stale PR approvals when new commits are pushed**: ✅
   - **Do not allow bypassing the above settings**: ✅ (for admins)
   - **Restrict who can push to matching branches**: ✅
     - Add only: `main` branch maintainers or deployment bots
   - **Allow force pushes**: ❌
   - **Allow deletions**: ❌

## Verification

After configuration, verify the rules are working:

1. Create a test branch: `git checkout -b test/protection`
2. Make a trivial change and push: `git push origin test/protection`
3. Open a PR to `main`
4. Confirm that:
   - The PR shows "Required checks must pass"
   - The PR shows "At least 1 approving review is required"
   - You cannot merge until checks pass and review is approved
   - Force push to `main` is rejected

## Troubleshooting

### Status checks not appearing
- Ensure the workflows have run at least once on the repository
- Check that workflow names match exactly (case-sensitive)
- Verify workflows are not disabled in repository Actions settings

### Bypassing protection
- Only repository admins can bypass protection rules if "Do not allow bypassing" is disabled
- For production repositories, enable "Do not allow bypassing the above settings"

### Code owner reviews
- Create a `CODEOWNERS` file in the repository root to require specific reviewers for certain files
- See [GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-who-can-contribute-to-a-repository-with-code-owners) for syntax

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
