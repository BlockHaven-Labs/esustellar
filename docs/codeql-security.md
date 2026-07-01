# CodeQL Security Analysis

## Overview

This document describes the CodeQL static analysis setup for the EsuStellar project. CodeQL helps identify security vulnerabilities and code quality issues before mainnet launch.

## Workflow Configuration

**File**: `.github/workflows/codeql.yml`

### Languages Analyzed

- **TypeScript**: Mobile app, web app, SDK, and shared packages
- **Rust**: Smart contracts (registry and savings)

### Query Suites

Both languages use the `security-extended` and `security-and-quality` query suites, which include:
- Security vulnerability detection
- Code quality issues
- Best practice violations

### Query Filters

TypeScript analysis excludes the following noisy alerts:
- `js/unused-local-variable` - Unused local variables
- `js/unused-import` - Unused imports

These are excluded to reduce noise while maintaining security coverage.

## Triggers

The CodeQL workflow runs on:
- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop`
- **Weekly schedule**: Sundays at 00:00 UTC
- **Manual dispatch**: Can be triggered from GitHub Actions UI

## Branch Protection

CodeQL Analysis is configured as a required status check for the `main` branch. See `docs/branch-protection.md` for details.

## Reviewing Findings

### Accessing Results

1. Navigate to the **Security** tab in the GitHub repository
2. Click on **Code scanning alerts** in the left sidebar
3. Filter by severity, language, or status

### Severity Levels

- **Critical**: Immediate action required before mainnet launch
- **High**: Should be addressed before mainnet launch
- **Medium**: Review and address if feasible before launch
- **Low**: Can be addressed post-launch, but should be tracked

### Triage Process

Before mainnet launch, all findings should be reviewed and triaged:

1. **Assess severity**: Determine if the finding is a false positive or a genuine issue
2. **Evaluate impact**: Consider the security and operational impact
3. **Plan remediation**: Fix genuine issues, suppress false positives with justification
4. **Document decisions**: Record triage decisions for audit purposes

### Suppressing False Positives

To suppress a false positive, add a CodeQL comment to the code:

```typescript
// For TypeScript
// eslint-disable-next-line codeql-no-unused-variable
const unused = value;
```

```rust
// For Rust
// CodeQL: Suppress false positive - variable used in macro expansion
let unused = value;
```

Document the suppression reason in the PR description or commit message.

## Pre-Launch Checklist

Before mainnet launch, ensure:

- [ ] All critical and high-severity findings are addressed
- [ ] Medium-severity findings are reviewed and either fixed or documented
- [ ] Low-severity findings are tracked in the backlog
- [ ] False positives are suppressed with documented justification
- [ ] CodeQL workflow is passing on the main branch
- [ ] Security team has reviewed the findings

## Continuous Monitoring

After mainnet launch:
- CodeQL will continue to run on every PR and push
- Weekly scans will catch new vulnerabilities introduced over time
- Review findings regularly as part of the security maintenance process

## References

- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning)
- [CodeQL Query Suites](https://codeql.github.com/codeql-query-help/)
- [Customizing CodeQL Analysis](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/customizing-code-scanning)
