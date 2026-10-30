#!/usr/bin/env bash
# #1284: Estimates the monthly compute cost of the k8s workloads defined in
# infra/k8s/overlays/{mainnet,staging,testnet}. The existing infracost.yml only
# covers AWS resources provisioned by Terraform (VPC, S3, KMS, etc.) — this
# script fills the gap by estimating the cost of the pods running inside the
# cluster.
#
# Method: render each overlay with kustomize, parse the rendered Deployment to
# extract replica count and container resource requests, then apply AWS
# on-demand EC2 rates to estimate cost. Costs are based on resource REQUESTS
# (what the scheduler reserves), not limits, because requests determine the
# minimum node capacity the cluster must provide.
#
# Pricing is derived from m5.large on-demand rates in us-east-1 (~$0.096/hr
# for 2 vCPU + 8 GiB → $0.048/vCPU-hr, $0.012/GiB-hr). These are static
# estimates, not real-time prices; update the constants below when AWS
# pricing changes materially.
#
# Usage:
#   ./infra/scripts/estimate-k8s-cost.sh           # human-readable table
#   ./infra/scripts/estimate-k8s-cost.sh --json    # JSON for CI consumption
#
# Exit codes: 0 on success, 1 on a rendering/parsing error, 2 on usage error.
set -euo pipefail

# ---------------------------------------------------------------------------
# Pricing constants (us-east-1 on-demand, derived from m5.large)
# Update these when AWS pricing changes materially. See header comment.
# ---------------------------------------------------------------------------
CPU_RATE_PER_VCPU_HOUR="0.048"   # USD per vCPU-hour
MEM_RATE_PER_GIB_HOUR="0.012"    # USD per GiB-hour
HOURS_PER_MONTH=730             # 365.25 * 24 / 12

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OVERLAY_ROOT="$REPO_ROOT/infra/k8s/overlays"

OUTPUT_FORMAT="table"

usage() {
  echo "Usage: $0 [--json]" >&2
  echo "  --json   Output results as JSON (for CI consumption)" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) OUTPUT_FORMAT="json"; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then
  if ! command -v kustomize >/dev/null 2>&1; then
    echo "ERROR: neither kubectl nor kustomize found on PATH" >&2
    exit 1
  fi
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  pip3 install --quiet pyyaml >/dev/null 2>&1 || true
fi

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "ERROR: PyYAML is required but could not be imported" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Render all overlays and estimate cost
# ---------------------------------------------------------------------------
OVERLAYS=("mainnet" "staging" "testnet")

render_overlay() {
  local overlay="$1"
  if command -v kubectl >/dev/null 2>&1; then
    kubectl kustomize "$OVERLAY_ROOT/$overlay"
  else
    kustomize build "$OVERLAY_ROOT/$overlay"
  fi
}

# Export variables for the Python script
export CPU_RATE_PER_VCPU_HOUR MEM_RATE_PER_GIB_HOUR HOURS_PER_MONTH OVERLAY_ROOT
export OVERLAYS_OUTPUT_FILE="/tmp/estimate-k8s-cost-rendered-$$.yaml"
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  export ESTIMATE_K8S_JSON=1
fi

# Render all overlays into a single multi-doc YAML with environment markers
{
  for overlay in "${OVERLAYS[@]}"; do
    echo "---"
    echo "# __overlay__: $overlay"
    render_overlay "$overlay"
  done
} > "$OVERLAYS_OUTPUT_FILE"

python3 - <<'PYEOF'
import json
import os
import re
import sys
import yaml

CPU_RATE = float(os.environ["CPU_RATE_PER_VCPU_HOUR"])
MEM_RATE = float(os.environ["MEM_RATE_PER_GIB_HOUR"])
HOURS    = float(os.environ["HOURS_PER_MONTH"])
render_file = os.environ["OVERLAYS_OUTPUT_FILE"]

# ---------------------------------------------------------------------------
# Parse rendered manifests
# ---------------------------------------------------------------------------
# The rendered file has marker comments (# __overlay__: <env>) before each
# overlay's documents. We split on those markers to attribute docs to envs.
with open(render_file) as f:
    raw = f.read()

# Split into sections by the overlay marker
sections = re.split(r'^# __overlay__: (\w+)\s*$', raw, flags=re.MULTILINE)
# sections[0] is preamble (empty or "---"), then pairs of (env, yaml_docs)
envs = []
for i in range(1, len(sections), 2):
    env_name = sections[i]
    yaml_text = sections[i + 1]
    # Strip leading "---" that precedes the marker
    yaml_text = re.sub(r'^\n*---\n*', '', yaml_text)
    docs = [d for d in yaml.safe_load_all(yaml_text) if d]
    envs.append((env_name, docs))

if not envs:
    print("ERROR: no overlays rendered", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Helper: parse Kubernetes resource quantity into a base unit
# ---------------------------------------------------------------------------
def parse_cpu(quantity):
    """Parse a CPU quantity string (e.g. '100m', '0.5', '2') into vCPUs (float)."""
    if quantity is None:
        return 0.0
    q = str(quantity).strip()
    if q.endswith('m'):
        return float(q[:-1]) / 1000.0
    return float(q)

def parse_memory_to_gib(quantity):
    """Parse a memory quantity string (e.g. '128Mi', '1Gi', '512') into GiB (float)."""
    if quantity is None:
        return 0.0
    q = str(quantity).strip()
    # Binary suffixes
    suffixes = {
        'Ki': 1 / (1024 * 1024),
        'Mi': 1 / 1024,
        'Gi': 1.0,
        'Ti': 1024.0,
        'Pi': 1024.0 * 1024,
        # Decimal suffixes (less common in k8s but valid)
        'K':  1 / (1000 * 1000 * 1.073741824),
        'M':  1 / (1000 * 1.073741824),
        'G':  1 / 1.073741824,
        'T':  1000 / 1.073741824,
    }
    for suffix, factor in suffixes.items():
        if q.endswith(suffix):
            return float(q[:-len(suffix)]) * factor
    # No suffix — bytes
    return float(q) / (1024 ** 3)

# ---------------------------------------------------------------------------
# Extract cost-relevant data from each environment's rendered manifests
# ---------------------------------------------------------------------------
results = []
for env_name, docs in envs:
    deployment = next((d for d in docs if d.get("kind") == "Deployment"), None)
    hpa = next((d for d in docs if d.get("kind") == "HorizontalPodAutoscaler"), None)

    if deployment is None:
        print(f"WARNING: {env_name} rendered no Deployment — skipping", file=sys.stderr)
        continue

    spec = deployment.get("spec", {})
    replicas = spec.get("replicas", 1)
    pod_spec = spec.get("template", {}).get("spec", {})
    containers = pod_spec.get("containers", [])

    # Sum resource requests across all containers in the pod
    total_cpu_req = 0.0  # vCPU
    total_mem_req = 0.0  # GiB
    for c in containers:
        resources = c.get("resources", {})
        requests = resources.get("requests", {})
        total_cpu_req += parse_cpu(requests.get("cpu"))
        total_mem_req += parse_memory_to_gib(requests.get("memory"))

    # HPA range
    hpa_min = None
    hpa_max = None
    if hpa is not None:
        hpa_spec = hpa.get("spec", {})
        hpa_min = hpa_spec.get("minReplicas")
        hpa_max = hpa_spec.get("maxReplicas")

    # Cost calculations (based on requests, which is what the scheduler reserves)
    cpu_cost_per_pod_month = total_cpu_req * CPU_RATE * HOURS
    mem_cost_per_pod_month = total_mem_req * MEM_RATE * HOURS
    cost_per_pod_month = cpu_cost_per_pod_month + mem_cost_per_pod_month
    total_monthly = cost_per_pod_month * replicas

    # Max cost if HPA scales to maxReplicas
    max_monthly = None
    if hpa_max is not None:
        max_monthly = cost_per_pod_month * hpa_max

    results.append({
        "environment": env_name,
        "replicas": replicas,
        "cpu_request_vcpu": round(total_cpu_req, 4),
        "memory_request_gib": round(total_mem_req, 4),
        "cpu_cost_per_pod_month": round(cpu_cost_per_pod_month, 2),
        "mem_cost_per_pod_month": round(mem_cost_per_pod_month, 2),
        "cost_per_pod_month": round(cost_per_pod_month, 2),
        "total_monthly": round(total_monthly, 2),
        "hpa_min_replicas": hpa_min,
        "hpa_max_replicas": hpa_max,
        "max_monthly_at_hpa_ceiling": round(max_monthly, 2) if max_monthly else None,
    })

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
grand_total = sum(r["total_monthly"] for r in results)
grand_max = sum(r["max_monthly_at_hpa_ceiling"] for r in results if r["max_monthly_at_hpa_ceiling"])

output_format = os.environ.get("ESTIMATE_K8S_OUTPUT_FORMAT", "table")

# Check if JSON mode was requested via the wrapper
if os.environ.get("ESTIMATE_K8S_JSON") == "1":
    output = {
        "pricing": {
            "cpu_rate_per_vcpu_hour": CPU_RATE,
            "mem_rate_per_gib_hour": MEM_RATE,
            "hours_per_month": int(HOURS),
            "basis": "m5.large on-demand, us-east-1 (~$0.096/hr for 2 vCPU + 8 GiB)",
        },
        "environments": results,
        "grand_total_monthly": round(grand_total, 2),
        "grand_max_monthly_at_hpa_ceiling": round(grand_max, 2) if grand_max else None,
    }
    print(json.dumps(output, indent=2))
else:
    # Human-readable table
    header = f"{'Environment':<12} {'Replicas':>8} {'CPU req':>10} {'Mem req':>10} {'$/pod/mo':>10} {'Total $/mo':>12}"
    sep = "-" * len(header)
    print()
    print("K8s Workload Cost Estimate")
    print("=" * len(header))
    print()
    print(f"Pricing basis: m5.large on-demand (us-east-1)")
    print(f"  CPU:  ${CPU_RATE:.4f}/vCPU-hr   Memory: ${MEM_RATE:.4f}/GiB-hr   Hours/mo: {int(HOURS)}")
    print(f"  (Costs based on resource REQUESTS, not limits)")
    print()
    print(header)
    print(sep)
    for r in results:
        print(f"{r['environment']:<12} {r['replicas']:>8} "
              f"{r['cpu_request_vcpu']:>9.3f}v {r['memory_request_gib']:>9.3f}G "
              f"${r['cost_per_pod_month']:>9.2f} ${r['total_monthly']:>11.2f}")
    print(sep)
    print(f"{'TOTAL':<12} {'':>8} {'':>10} {'':>10} {'':>10} ${grand_total:>11.2f}")
    print()
    # HPA ceiling info
    hpa_envs = [r for r in results if r["max_monthly_at_hpa_ceiling"]]
    if hpa_envs:
        print(f"If all HPAs scale to maxReplicas: ${grand_max:.2f}/mo")
        for r in hpa_envs:
            print(f"  {r['environment']:<12} {r['replicas']} → {r['hpa_max_replicas']} replicas: "
                  f"${r['total_monthly']:.2f} → ${r['max_monthly_at_hpa_ceiling']:.2f}/mo")
    print()
    print("NOTE: Estimates are static and based on AWS on-demand pricing.")
    print("      Update pricing constants in the script when AWS rates change.")
    print("      Spot/Fargate pricing will differ — see script header for details.")
PYEOF

# Clean up temp file
rm -f "$OVERLAYS_OUTPUT_FILE"
