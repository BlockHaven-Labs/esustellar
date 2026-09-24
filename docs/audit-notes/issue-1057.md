# Issue #1057: Docker base image not pinned to digest

**File audited:** `Dockerfile`

## Finding
`FROM node:26-alpine AS base` floats on whatever `node:26-alpine`
resolves to at build time, which is not reproducible and leaves the
build exposed to an unreviewed base-image change.

## Recommendation
Pin to a specific digest, e.g.
`FROM node:26-alpine@sha256:<digest> AS base`, and let Dependabot (see
#1054) manage digest bumps via PR going forward.

## Follow-up
Resolve the current digest and apply the pin in a focused follow-up
diff to `Dockerfile`.
