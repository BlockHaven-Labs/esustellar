# Setup Branch Protection Rules for Main Branch
# This script uses GitHub CLI to configure branch protection rules
# Usage: .\scripts\setup-branch-protection.ps1

$ErrorActionPreference = "Stop"

$Repo = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "BlockHaven-Labs/esustellar" }
$Branch = "main"

Write-Host "Setting up branch protection for $Repo/$Branch" -ForegroundColor Cyan

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Error: GitHub CLI (gh) is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if user is authenticated
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Not authenticated with GitHub CLI" -ForegroundColor Red
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuring branch protection rules..." -ForegroundColor Cyan

$body = @{
    required_status_checks = @{
        strict = $true
        contexts = @(
            "Docker CI / build",
            "E2E Status Gate"
        )
        checks = @(
            @{
                context = "Docker CI / build"
                app_id = $null
            },
            @{
                context = "E2E Status Gate"
                app_id = $null
            }
        )
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $false
        require_last_push_approval = $false
        required_approving_review_count = 1
    }
    restrictions = $null
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $false
    lock_branch = $false
    allow_fork_syncing = $false
} | ConvertTo-Json -Depth 10

gh api `
  --method PUT `
  --header "Accept: application/vnd.github+json" `
  "repos/$Repo/branches/$Branch/protection" `
  --input - <<< $body

Write-Host "✅ Branch protection rules configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary of rules applied:" -ForegroundColor Cyan
Write-Host "  - Required status checks: Docker CI / build, E2E Status Gate"
Write-Host "  - Strict mode: enabled (branches must be up-to-date)"
Write-Host "  - Required approving reviews: 1"
Write-Host "  - Dismiss stale reviews: enabled"
Write-Host "  - Force pushes: disabled"
Write-Host "  - Deletions: disabled"
Write-Host "  - Admin enforcement: enabled"
