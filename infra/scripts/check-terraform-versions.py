#!/usr/bin/env python3
"""Fail when Terraform roots drift apart on CLI or shared provider versions.

Run from anywhere: `python3 infra/scripts/check-terraform-versions.py`.
Roots with no *.tf files (e.g. environments/testnet, now a contract-deploy
workspace) are reported but not treated as a failure.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_ROOTS = (
    "infra/terraform",
    "infra/testnet",
    "environments/staging",
    "environments/testnet",
)
SKIP_PARTS = {".terraform", ".git", "modules"}
REQUIRED_VERSION_RE = re.compile(r'required_version\s*=\s*"([^"]+)"')
PROVIDER_RE = re.compile(
    r'source\s*=\s*"([^"]+)"\s*version\s*=\s*"([^"]+)"'
)


def discover_roots() -> dict[str, dict]:
    paths = list((ROOT / "infra").rglob("*.tf")) + list(
        (ROOT / "environments").rglob("*.tf")
    )
    roots: dict[str, dict] = {}
    for path in sorted(paths):
        rel_parts = path.relative_to(ROOT).parts
        if any(part in SKIP_PARTS for part in rel_parts[:-1]):
            continue
        rel = str(Path(*rel_parts[:-1]))
        roots.setdefault(rel, {"terraform": None, "providers": {}})
    return roots


def scan_root(rel: str) -> dict:
    result: dict = {"terraform": None, "providers": {}}
    for path in sorted((ROOT / rel).glob("*.tf")):
        text = path.read_text(encoding="utf-8")
        if result["terraform"] is None:
            match = REQUIRED_VERSION_RE.search(text)
            if match:
                result["terraform"] = match.group(1)
        for match in PROVIDER_RE.finditer(text):
            result["providers"].setdefault(match.group(1), match.group(2))
    return result


def main() -> int:
    roots = discover_roots()
    for expected in EXPECTED_ROOTS:
        if expected not in roots:
            print(f"NOTE: {expected} has no Terraform root; skipping")

    print(f"{'Root':<32} {'Terraform':<20} Providers")
    print("-" * 78)
    for rel in sorted(roots):
        roots[rel] = scan_root(rel)
        data = roots[rel]
        providers = ", ".join(
            f"{source}={version}"
            for source, version in sorted(data["providers"].items())
        )
        print(
            f"{rel:<32} {str(data['terraform']):<20} {providers or '(none)'}"
        )

    errors: list[str] = []
    terraform_versions = {
        rel: data["terraform"]
        for rel, data in roots.items()
        if data["terraform"] is not None
    }
    if not terraform_versions:
        errors.append("no root declares required_version")
    if any(data["terraform"] is None for data in roots.values()):
        for rel, data in sorted(roots.items()):
            if data["terraform"] is None:
                errors.append(f"{rel}: missing required_version")

    distinct_cli = sorted(set(terraform_versions.values()))
    if len(distinct_cli) > 1:
        errors.append(
            "Terraform CLI constraints differ across roots: "
            + ", ".join(
                f"{rel}={version}"
                for rel, version in sorted(terraform_versions.items())
            )
        )

    provider_versions: dict[str, dict[str, str]] = {}
    for rel, data in roots.items():
        for source, version in data["providers"].items():
            provider_versions.setdefault(source, {})[rel] = version
    for source, by_root in sorted(provider_versions.items()):
        distinct = sorted(set(by_root.values()))
        if len(distinct) > 1:
            errors.append(
                f"{source} version differs across roots: "
                + ", ".join(
                    f"{rel}={version}" for rel, version in sorted(by_root.items())
                )
            )

    if errors:
        print("\nTerraform version alignment FAILED:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("\nOK: all Terraform roots agree on CLI and shared provider versions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
