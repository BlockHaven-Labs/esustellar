#!/usr/bin/env python3
"""Fail if any Terraform `variable` block is missing a `description`.

#1126 — every variable in every root and module already carries a description
(as of this check being added: 58/58), so the gap this issue describes is
closed. What is not closed is whether it *stays* closed: descriptions are easy
to omit in a new module, and their absence is exactly what makes `terraform plan`
output and `terraform-docs`-generated documentation useless for the cross-
environment auditing this repository needs.

This script is the enforcement. It is deliberately a cheap text scan rather than
an `hcl2` parse: it must run in pre-commit and in CI without a Terraform
binary, and a missing `description` is a structural mistake that a scan catches
reliably.

Usage:
    python3 infra/scripts/check-terraform-variable-docs.py [path ...]

With no arguments it scans the whole repository's tracked Terraform paths.
Exits 0 when every variable has a non-empty description, 1 otherwise.

The HCL it understands: a top-level `variable "name" { ... }` block, terminated
by a line that starts with `}` in column 0. A `description` counts only when it
appears at the top nesting level of the block (depth 1), so a `description`
inside a nested block such as `validation` does not satisfy the requirement.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Directories that contain no Terraform we own.
SKIP_DIRS = {
    ".git",
    ".terraform",
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
}

VARIABLE_START = re.compile(r'^variable\s+"([^"]+)"\s*\{')
DESCRIPTION = re.compile(r'^\s*description\s*=\s*\S')
BLOCK_OPENERS = ("{", "[", "(")
BLOCK_CLOSERS = ("}", "]", ")")


def strip_comments(line: str) -> str:
    """Remove a trailing # comment and a full-line comment.

    `description = "..." # note` and `# description = "x"` must not count.
    A '#' inside a quoted string is left alone, which is all this needs.
    """
    out = []
    in_string = False
    escape = False
    for ch in line:
        if escape:
            out.append(ch)
            escape = False
            continue
        if ch == "\\":
            out.append(ch)
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            out.append(ch)
            continue
        if ch == "#" and not in_string:
            break
        out.append(ch)
    return "".join(out)


def block_body_depth(lines: list[str]) -> tuple[bool, int]:
    """Walk the body of a variable block.

    Returns (has_top_level_description, saw_any_description_at_any_depth).
    """
    depth = 1
    has_top = False
    has_any = False

    for raw in lines:
        line = strip_comments(raw).rstrip()
        if not line:
            continue

        # A description is only "top level" at the point where the running
        # depth is 1, i.e. directly inside `variable "x" {`.
        if DESCRIPTION.match(line) and depth == 1:
            has_top = True
        elif DESCRIPTION.match(line):
            has_any = True

        # Net brace change for this line, ignoring quoted content.
        net = 0
        in_string = False
        escape = False
        for ch in line:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch in BLOCK_OPENERS:
                net += 1
            elif ch in BLOCK_CLOSERS:
                net -= 1

        depth += net
        if depth <= 0:
            break

    return has_top, has_any


def check_file(path: Path) -> list[tuple[str, str]]:
    """Return a list of (variable_name, reason) for undescribed variables."""
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return [("<file>", f"could not read: {exc}")]

    lines = text.splitlines()
    problems: list[tuple[str, str]] = []
    index = 0

    while index < len(lines):
        match = VARIABLE_START.match(lines[index])
        if not match:
            index += 1
            continue

        name = match.group(1)
        # Collect until depth returns to zero (handled inside block_body_depth).
        body: list[str] = []
        cursor = index + 1
        depth = 1
        while cursor < len(lines):
            line = strip_comments(lines[cursor]).rstrip()
            net = 0
            in_string = False
            escape = False
            for ch in line:
                if escape:
                    escape = False
                    continue
                if ch == "\\":
                    escape = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch in BLOCK_OPENERS:
                    net += 1
                elif ch in BLOCK_CLOSERS:
                    net -= 1
            depth += net
            body.append(lines[cursor])
            cursor += 1
            if depth <= 0:
                break

        has_top, has_any = block_body_depth(body)
        if not has_top:
            if has_any:
                problems.append(
                    (name, "has a description, but it is nested inside another block")
                )
            else:
                problems.append((name, "has no description"))

        index = cursor if cursor > index else index + 1

    return problems


def iter_tf_files(roots: list[Path]) -> list[Path]:
    found: set[Path] = set()
    for root in roots:
        if root.is_file():
            if root.suffix == ".tf":
                found.add(root)
            continue
        for path in root.rglob("*.tf"):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            found.add(path)
    return sorted(found)


def main(argv: list[str]) -> int:
    repo_root = Path(__file__).resolve().parents[2]
    targets = [Path(a) for a in argv] if argv else [repo_root]
    targets = [t if t.is_absolute() else (Path.cwd() / t) for t in targets]

    files = iter_tf_files(targets)
    if not files:
        print("check-terraform-variable-docs: no .tf files found", file=sys.stderr)
        return 1

    total_vars = 0
    failures: list[tuple[Path, str, str]] = []

    for path in files:
        problems = check_file(path)
        # Count variables for the summary line.
        text = path.read_text(encoding="utf-8", errors="replace")
        total_vars += len(re.findall(r'^variable\s+"[^"]+"\s*\{', text, re.MULTILINE))
        for name, reason in problems:
            try:
                rel = path.relative_to(repo_root)
            except ValueError:
                rel = path
            failures.append((rel, name, reason))

    for rel, name, reason in failures:
        print(f"{rel}: variable \"{name}\" {reason}", file=sys.stderr)

    if failures:
        print(
            f"\ncheck-terraform-variable-docs: {len(failures)} of {total_vars} variables "
            "lack a top-level description.\n"
            "Every variable needs a `description` explaining what it controls and, where "
            "it matters, what the recommended value is per environment. Missing "
            "descriptions are what make terraform plan output and terraform-docs "
            "unusable for cross-environment auditing (#1126).",
            file=sys.stderr,
        )
        return 1

    print(
        f"check-terraform-variable-docs: all {total_vars} variables across "
        f"{len(files)} Terraform files have descriptions."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))