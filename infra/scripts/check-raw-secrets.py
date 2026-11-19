#!/usr/bin/env python3
"""#1468: Fail if a plain Kubernetes `Secret` manifest holds anything other
than the non-sensitive placeholder keys allowed below.

k8s/config/*-secret.yaml are plain `Secret` objects (not SealedSecrets) that
carry placeholder defaults only. A real credential added there would be
committed in the clear, so any `data` / `stringData` key outside ALLOWED_KEYS
fails the check. SealedSecret manifests are ignored: they are encrypted.

Values are never printed. No third-party dependencies: the manifests are
scanned line by line, which is enough for the flat key/value shape used here.
"""
import os
import re
import sys

ROOTS = ("k8s", "infra/k8s", "infra/secrets", "environments")
# Keys that are allowed to appear in a plain Secret because they are not sensitive.
ALLOWED_KEYS = {"NODE_ENV"}
SKIP_DIRS = {".git", "node_modules"}


def manifests():
    for root in ROOTS:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                if name.endswith((".yaml", ".yml")):
                    yield os.path.join(dirpath, name)


def check(path):
    problems = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        documents = re.split(r"^---\s*$", f.read(), flags=re.M)
    for doc in documents:
        lines = doc.splitlines()
        if not any(re.match(r"^kind:\s*Secret\s*(#.*)?$", line) for line in lines):
            continue
        section = None
        for line in lines:
            if re.match(r"^(data|stringData):\s*(#.*)?$", line):
                section = line.split(":", 1)[0]
                continue
            if re.match(r"^\S", line) and not line.startswith("#"):
                section = None
                continue
            if section and (match := re.match(r"^\s+([A-Za-z0-9_.\-]+):", line)):
                key = match.group(1)
                if key not in ALLOWED_KEYS:
                    problems.append(f"{path}: Secret key `{key}` under `{section}` is not an allowed placeholder")
    return problems


def main():
    problems = []
    for path in manifests():
        problems.extend(check(path))
    for problem in problems:
        print(problem)
    if problems:
        print("\nConvert real values to SealedSecrets (see infra/secrets/README.md); never commit them in a plain Secret.")
        return 1
    print("OK: no plain Secret manifest holds values outside the placeholder allow-list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
