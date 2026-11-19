#!/usr/bin/env python3
"""#1465: Keep the top-level .env.example and infra/secrets/templates/.env.example
from drifting apart silently.

The two files serve different purposes (application config vs infra and
deployment config) and are not meant to be identical. The rule enforced here is
the one documented in infra/secrets/README.md ("The two .env.example files"):

  * every variable in the top-level .env.example must also appear in the infra
    template, unless it is listed in the README's `app-only-env` block;
  * every variable listed in that block must still exist in the top-level file
    (so the list cannot go stale).

No third-party dependencies. Exits 1 and prints each problem on failure.
"""
import re
import sys

TOP_LEVEL = ".env.example"
TEMPLATE = "infra/secrets/templates/.env.example"
README = "infra/secrets/README.md"

VAR = re.compile(r"^\s*#?\s*([A-Z][A-Z0-9_]*)=", re.M)
BLOCK = re.compile(r"<!-- app-only-env:start -->(.*?)<!-- app-only-env:end -->", re.S)


def variables(path):
    # Commented-out examples such as `# NAME=value` still count as documented variables.
    with open(path, "r", encoding="utf-8") as f:
        return set(VAR.findall(f.read()))


def app_only(path):
    with open(path, "r", encoding="utf-8") as f:
        match = BLOCK.search(f.read())
    if not match:
        return None
    # Only the variable at the start of each bullet counts; other names in the prose do not.
    return set(re.findall(r"^- `([A-Z][A-Z0-9_]*)`", match.group(1), re.M))


def main():
    top = variables(TOP_LEVEL)
    template = variables(TEMPLATE)
    allowed = app_only(README)
    if allowed is None:
        print(f"{README}: missing the <!-- app-only-env:start --> ... <!-- app-only-env:end --> block")
        return 1

    problems = []
    for name in sorted(top - template - allowed):
        problems.append(
            f"{name} is in {TOP_LEVEL} but not in {TEMPLATE}; add it there, or list it as "
            f"app-only in {README}"
        )
    for name in sorted(allowed - top):
        problems.append(f"{name} is listed as app-only in {README} but is not in {TOP_LEVEL}")
    for name in sorted(allowed & template):
        problems.append(f"{name} is listed as app-only in {README} but is also in {TEMPLATE}")

    for problem in problems:
        print(problem)
    if not problems:
        print(f"OK: {TOP_LEVEL} and {TEMPLATE} are consistent ({len(allowed)} app-only variable(s)).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
