#!/usr/bin/env python3
"""
Validates that Kubernetes ConfigMaps have required contract IDs populated.
Usage: python validate-configmaps.py [config-map-dir]
Exit codes: 0 = all valid, 1 = validation failed
"""

import sys
import yaml
from pathlib import Path

REQUIRED_KEYS = [
    "NEXT_PUBLIC_SAVINGS_CONTRACT_ID",
    "NEXT_PUBLIC_REGISTRY_CONTRACT_ID",
    "NEXT_PUBLIC_CONTRACT_ID",
]

def validate_configmaps(config_dir: Path) -> int:
    print(f"Validating ConfigMaps in {config_dir}...")

    failed = 0

    for config_file in sorted(config_dir.glob("*.yaml")):
        if "secret" in config_file.name:
            continue

        print(f"Checking {config_file}...")

        try:
            with open(config_file) as f:
                doc = yaml.safe_load(f)
        except Exception as e:
            print(f"  [FAIL] Could not parse YAML: {e}")
            return 1

        if not doc or doc.get("kind") != "ConfigMap":
            print(f"  [SKIP] Not a ConfigMap")
            continue

        namespace = doc.get("metadata", {}).get("namespace", "unknown")
        data = doc.get("data", {})

        for key in REQUIRED_KEYS:
            value = data.get(key, "")

            if not value:
                print(f"  [FAIL] {key} is empty in {config_file} (namespace: {namespace})")
                failed = 1
            elif "MUST BE POPULATED" in value or "DO NOT COMMIT" in value:
                print(f"  [FAIL] {key} contains template placeholder in {config_file} (namespace: {namespace})")
                failed = 1
            else:
                print(f"  [OK] {key} = {value[:20]}...")

    if failed:
        print("\nValidation FAILED: One or more ConfigMaps have empty or template contract IDs.")
        print("Ensure all required keys are populated with real contract IDs before deployment.")
        return 1

    print("\nAll ConfigMaps validated successfully.")
    return 0


if __name__ == "__main__":
    config_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("k8s/config")
    sys.exit(validate_configmaps(config_dir))