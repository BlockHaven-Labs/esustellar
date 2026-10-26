#!/usr/bin/env bash
# k8s-cost-estimate.sh
#
# Estimates the monthly compute cost of running the esustellar K8s workload
# across mainnet (3 replicas), staging (2 replicas), and testnet (1 replica)
# by reading resource requests/limits from the base deployment and the per-
# environment replica counts from the kustomize overlays.
#
# Methodology
# -----------
# We use the *request* values (what the scheduler guarantees) for the lower
# bound and the *limit* values for the upper bound. Pricing uses on-demand
# AWS EKS (us-east-1) equivalents as a publicly-known reference:
#
#   vCPU-hour  : $0.04480  (Fargate — closest per-pod pricing proxy)
#   GB-RAM-hour: $0.00491
#
# These are hard-coded reference prices. To use real prices for a different
# provider or region, override via environment variables:
#   CPU_PRICE_PER_VCPU_HOUR  (default 0.04480)
#   MEM_PRICE_PER_GB_HOUR    (default 0.00491)
#
# Output: a Markdown table printed to stdout, suitable for pasting into a
# GitHub PR comment via $GITHUB_STEP_SUMMARY or gh pr comment.
#
# Usage:
#   ./scripts/k8s-cost-estimate.sh
#   ./scripts/k8s-cost-estimate.sh --json      # emit JSON instead of Markdown
#
# Exit codes:
#   0  success
#   1  required file not found

set -euo pipefail

# ---------------------------------------------------------------------------
# Configurable reference prices (override via env)
# ---------------------------------------------------------------------------
CPU_PRICE_PER_VCPU_HOUR="${CPU_PRICE_PER_VCPU_HOUR:-0.04480}"
MEM_PRICE_PER_GB_HOUR="${MEM_PRICE_PER_GB_HOUR:-0.00491}"
HOURS_PER_MONTH=730  # 365 * 24 / 12

# ---------------------------------------------------------------------------
# Resolve repo root so the script is runnable from any working directory
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BASE_DEPLOYMENT="${REPO_ROOT}/infra/k8s/base/deployment.yaml"
OVERLAY_MAINNET="${REPO_ROOT}/infra/k8s/overlays/mainnet/kustomization.yaml"
OVERLAY_STAGING="${REPO_ROOT}/infra/k8s/overlays/staging/kustomization.yaml"
OVERLAY_TESTNET="${REPO_ROOT}/infra/k8s/overlays/testnet/kustomization.yaml"

for f in "$BASE_DEPLOYMENT" "$OVERLAY_MAINNET" "$OVERLAY_STAGING" "$OVERLAY_TESTNET"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: required file not found: $f" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Parse resource requests/limits from the base deployment
# Values are in millicores (m) for CPU and Mi/Gi for memory.
# ---------------------------------------------------------------------------
parse_millicores() {
  local raw="$1"
  if [[ "$raw" =~ ^([0-9]+)m$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$raw" =~ ^([0-9]+)$ ]]; then
    # plain integer means whole cores
    echo $(( BASH_REMATCH[1] * 1000 ))
  else
    echo "0"
  fi
}

parse_mebibytes() {
  local raw="$1"
  if [[ "$raw" =~ ^([0-9]+)Mi$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$raw" =~ ^([0-9]+)Gi$ ]]; then
    echo $(( BASH_REMATCH[1] * 1024 ))
  elif [[ "$raw" =~ ^([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "0"
  fi
}

# Extract resource values using grep + sed (no yq dependency required)
cpu_request_raw=$(grep -A3 'requests:' "$BASE_DEPLOYMENT" | grep 'cpu:' | head -1 | sed 's/.*cpu:[[:space:]]*//' | tr -d ' ')
cpu_limit_raw=$(grep -A3 'limits:' "$BASE_DEPLOYMENT"   | grep 'cpu:' | head -1 | sed 's/.*cpu:[[:space:]]*//' | tr -d ' ')
mem_request_raw=$(grep -A3 'requests:' "$BASE_DEPLOYMENT" | grep 'memory:' | head -1 | sed 's/.*memory:[[:space:]]*//' | tr -d ' ')
mem_limit_raw=$(grep -A3 'limits:' "$BASE_DEPLOYMENT"   | grep 'memory:' | head -1 | sed 's/.*memory:[[:space:]]*//' | tr -d ' ')

CPU_REQUEST_M=$(parse_millicores "$cpu_request_raw")
CPU_LIMIT_M=$(parse_millicores "$cpu_limit_raw")
MEM_REQUEST_MI=$(parse_mebibytes "$mem_request_raw")
MEM_LIMIT_MI=$(parse_mebibytes "$mem_limit_raw")

# ---------------------------------------------------------------------------
# Parse replica counts from kustomize overlays
# ---------------------------------------------------------------------------
parse_replicas() {
  local overlay_file="$1"
  # Look for:  count: N
  local count
  count=$(grep -A2 'replicas:' "$overlay_file" | grep 'count:' | head -1 | sed 's/.*count:[[:space:]]*//' | tr -d ' ')
  if [[ -z "$count" ]]; then
    echo "1"  # safe fallback
  else
    echo "$count"
  fi
}

REPLICAS_MAINNET=$(parse_replicas "$OVERLAY_MAINNET")
REPLICAS_STAGING=$(parse_replicas "$OVERLAY_STAGING")
REPLICAS_TESTNET=$(parse_replicas "$OVERLAY_TESTNET")

# ---------------------------------------------------------------------------
# Cost calculation using awk for floating-point arithmetic
# ---------------------------------------------------------------------------
compute_monthly_cost() {
  local replicas="$1"
  local cpu_m="$2"      # millicores
  local mem_mi="$3"     # mebibytes

  awk -v replicas="$replicas" \
      -v cpu_m="$cpu_m" \
      -v mem_mi="$mem_mi" \
      -v cpu_price="$CPU_PRICE_PER_VCPU_HOUR" \
      -v mem_price="$MEM_PRICE_PER_GB_HOUR" \
      -v hours="$HOURS_PER_MONTH" \
      'BEGIN {
        cpu_vcpu = cpu_m / 1000
        mem_gb   = mem_mi / 1024
        monthly  = replicas * hours * (cpu_vcpu * cpu_price + mem_gb * mem_price)
        printf "%.2f\n", monthly
      }'
}

COST_MAINNET_REQ=$(compute_monthly_cost "$REPLICAS_MAINNET" "$CPU_REQUEST_M" "$MEM_REQUEST_MI")
COST_MAINNET_LIM=$(compute_monthly_cost "$REPLICAS_MAINNET" "$CPU_LIMIT_M"   "$MEM_LIMIT_MI")
COST_STAGING_REQ=$(compute_monthly_cost "$REPLICAS_STAGING" "$CPU_REQUEST_M" "$MEM_REQUEST_MI")
COST_STAGING_LIM=$(compute_monthly_cost "$REPLICAS_STAGING" "$CPU_LIMIT_M"   "$MEM_LIMIT_MI")
COST_TESTNET_REQ=$(compute_monthly_cost "$REPLICAS_TESTNET" "$CPU_REQUEST_M" "$MEM_REQUEST_MI")
COST_TESTNET_LIM=$(compute_monthly_cost "$REPLICAS_TESTNET" "$CPU_LIMIT_M"   "$MEM_LIMIT_MI")

COST_TOTAL_REQ=$(awk -v a="$COST_MAINNET_REQ" -v b="$COST_STAGING_REQ" -v c="$COST_TESTNET_REQ" \
  'BEGIN { printf "%.2f\n", a+b+c }')
COST_TOTAL_LIM=$(awk -v a="$COST_MAINNET_LIM" -v b="$COST_STAGING_LIM" -v c="$COST_TESTNET_LIM" \
  'BEGIN { printf "%.2f\n", a+b+c }')

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--json" ]]; then
  cat <<EOF
{
  "pricing": {
    "cpu_per_vcpu_hour_usd": ${CPU_PRICE_PER_VCPU_HOUR},
    "mem_per_gb_hour_usd": ${MEM_PRICE_PER_GB_HOUR},
    "hours_per_month": ${HOURS_PER_MONTH},
    "reference": "AWS EKS Fargate on-demand us-east-1"
  },
  "base_resources": {
    "cpu_request_millicores": ${CPU_REQUEST_M},
    "cpu_limit_millicores": ${CPU_LIMIT_M},
    "mem_request_mebibytes": ${MEM_REQUEST_MI},
    "mem_limit_mebibytes": ${MEM_LIMIT_MI}
  },
  "environments": {
    "mainnet": {
      "replicas": ${REPLICAS_MAINNET},
      "estimated_monthly_cost_usd_lower": ${COST_MAINNET_REQ},
      "estimated_monthly_cost_usd_upper": ${COST_MAINNET_LIM}
    },
    "staging": {
      "replicas": ${REPLICAS_STAGING},
      "estimated_monthly_cost_usd_lower": ${COST_STAGING_REQ},
      "estimated_monthly_cost_usd_upper": ${COST_STAGING_LIM}
    },
    "testnet": {
      "replicas": ${REPLICAS_TESTNET},
      "estimated_monthly_cost_usd_lower": ${COST_TESTNET_REQ},
      "estimated_monthly_cost_usd_upper": ${COST_TESTNET_LIM}
    }
  },
  "total": {
    "estimated_monthly_cost_usd_lower": ${COST_TOTAL_REQ},
    "estimated_monthly_cost_usd_upper": ${COST_TOTAL_LIM}
  }
}
EOF
  exit 0
fi

# Markdown output
cat <<MARKDOWN
## ☸️ K8s Workload Cost Estimate

> **Advisory only** — figures are estimates based on resource requests/limits
> declared in \`infra/k8s/base/deployment.yaml\` and per-environment replica
> counts from the kustomize overlays. Actual cost depends on the underlying
> node type, region, and cloud provider negotiated rates.

### Reference pricing
| Item | Unit price |
|---|---|
| vCPU | \$${CPU_PRICE_PER_VCPU_HOUR} / vCPU-hour (AWS EKS Fargate on-demand, us-east-1) |
| RAM | \$${MEM_PRICE_PER_GB_HOUR} / GB-hour |

### Base container resources (from \`infra/k8s/base/deployment.yaml\`)
| | CPU | Memory |
|---|---|---|
| Request | ${cpu_request_raw} | ${mem_request_raw} |
| Limit   | ${cpu_limit_raw}   | ${mem_limit_raw}   |

### Per-environment monthly estimate

| Environment | Replicas | Lower bound (requests) | Upper bound (limits) |
|---|---|---|---|
| **mainnet** | ${REPLICAS_MAINNET} | \$${COST_MAINNET_REQ} | \$${COST_MAINNET_LIM} |
| **staging** | ${REPLICAS_STAGING} | \$${COST_STAGING_REQ} | \$${COST_STAGING_LIM} |
| **testnet** | ${REPLICAS_TESTNET} | \$${COST_TESTNET_REQ} | \$${COST_TESTNET_LIM} |
| **Total**   | — | **\$${COST_TOTAL_REQ}** | **\$${COST_TOTAL_LIM}** |

_Lower bound = all pods running at requested resources (typical steady state)._
_Upper bound = all pods bursting to their limits (peak / worst case)._

> To adjust pricing overrides set \`CPU_PRICE_PER_VCPU_HOUR\` and
> \`MEM_PRICE_PER_GB_HOUR\` before running this script.
MARKDOWN
