# ADR [NUMBER]: [TITLE]

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXX]

**Date:** YYYY-MM-DD

## Context

What is the issue that we're seeing that motivates this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Infrastructure cost impact

If this decision provisions or changes cloud resources, note the expected cost
impact here — even qualitatively. `.github/workflows/infracost.yml` posts an
estimate on PRs that touch Terraform, so include it when available and explain
any intentional tradeoff (e.g. one NAT gateway per AZ vs a single shared one).
If the decision has no infrastructure footprint, write "None".

- Resources added/changed:
- Expected delta (from infracost, or qualitative):
- Cost/availability tradeoff accepted:

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

- [LIST POSITIVE CONSEQUENCES]

### Negative

- [LIST NEGATIVE CONSEQUENCES]

### Neutral

- [LIST NEUTRAL CONSEQUENCES]
