# Infra Versioning Strategy

## Versioning Scheme
Infrastructure changes in `infra/` are versioned independently from application releases using calendar versioning (CalVer): `YYYY.MINOR.PATCH`.

- **YYYY** — year of the release
- **MINOR** — incremented for feature additions or breaking changes
- **PATCH** — incremented for bug fixes or non-breaking adjustments

## Changelog
All infra changes are recorded in `infra/CHANGELOG.md`. Each entry links to the relevant PR or commit.

## Tagging
Infra versions may be tagged as `infra-vYYYY.MINOR.PATCH` on the commit where the infra change was introduced.

## Relation to Application Releases
- App releases (tagged `vX.Y.Z`) document which infra version they require.
- Infra changes that affect app behaviour (e.g. new env vars, probe changes) must be coordinated with the app release cycle.
- Purely additive infra changes (new monitoring, docs) can be deployed independently.
