#!/usr/bin/env bash
set -euo pipefail

# Resource fee / gas benchmarking suite (#868)
#
# Benchmarks join_group and contribute at various member counts to provide
# visibility into per-call resource cost as group size scales.
#
# Usage:
#   ./scripts/benchmark-contracts.sh [--network testnet] [--contract-id <ID>]
#
# Output:
#   benchmarks/<timestamp>/results.csv
#   benchmarks/<timestamp>/results.md

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Defaults ──────────────────────────────────────────────────────────

NETWORK="testnet"
CONTRACT_ID="${SAVINGS_CONTRACT_ID:-}"
DEPLOYER="deployer"
MEMBER_SIZES=(5 10 25 50)
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUTPUT_DIR="$ROOT_DIR/benchmarks/$TIMESTAMP"

# ── Parse args ────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)    NETWORK="$2"; shift 2 ;;
    --contract-id) CONTRACT_ID="$2"; shift 2 ;;
    --deployer)   DEPLOYER="$2"; shift 2 ;;
    --output)     OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Resolve contract ID ──────────────────────────────────────────────

if [ -z "$CONTRACT_ID" ]; then
  DEPLOYMENT_FILE="$ROOT_DIR/deployment-info.json"
  if [ -f "$DEPLOYMENT_FILE" ]; then
    CONTRACT_ID=$(grep -o '"savings_contract_id": *"[^"]*"' "$DEPLOYMENT_FILE" | head -1 | cut -d'"' -f4)
  fi
fi

if [ -z "$CONTRACT_ID" ]; then
  echo "Error: No contract ID. Set SAVINGS_CONTRACT_ID or pass --contract-id." >&2
  exit 1
fi

# ── Validate CLI ─────────────────────────────────────────────────────

command -v stellar >/dev/null 2>&1 || { echo "Error: stellar CLI not found." >&2; exit 1; }

# ── Setup output ─────────────────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"
CSV_FILE="$OUTPUT_DIR/results.csv"
MD_FILE="$OUTPUT_DIR/results.md"

echo "operation,member_count,duration_ms,status" > "$CSV_FILE"

echo "# Benchmark Results — $(date -u +"%Y-%m-%d %H:%M:%S UTC")" > "$MD_FILE"
echo "" >> "$MD_FILE"
echo "- **Network:** $NETWORK" >> "$MD_FILE"
echo "- **Contract:** $CONTRACT_ID" >> "$MD_FILE"
echo "- **Deployer:** $DEPLOYER" >> "$MD_FILE"
echo "" >> "$MD_FILE"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  EsuStellar Contract Benchmarking Suite                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Network:    $NETWORK"
echo "Contract:   $CONTRACT_ID"
echo "Sizes:      ${MEMBER_SIZES[*]}"
echo "Output:     $OUTPUT_DIR"
echo ""

# ── Helpers ───────────────────────────────────────────────────────────

invoke_timed() {
  local contract_id="$1"; shift
  local start_ms end_ms duration_ms

  start_ms=$(($(date +%s%N) / 1000000))

  if stellar contract invoke \
    --id "$contract_id" \
    --source-account "$DEPLOYER" \
    --network "$NETWORK" \
    -- "$@" > /dev/null 2>&1; then
    end_ms=$(($(date +%s%N) / 1000000))
    duration_ms=$((end_ms - start_ms))
    echo "${duration_ms},ok"
  else
    end_ms=$(($(date +%s%N) / 1000000))
    duration_ms=$((end_ms - start_ms))
    echo "${duration_ms},error"
  fi
}

# ── Ensure deployer is funded ────────────────────────────────────────

echo "Funding deployer account..."
stellar keys fund "$DEPLOYER" --network "$NETWORK" 2>/dev/null || true

# ── Benchmark: join_group ────────────────────────────────────────────

echo "## join_group Benchmarks" >> "$MD_FILE"
echo "" >> "$MD_FILE"
echo "| Members | Duration (ms) | Status |" >> "$MD_FILE"
echo "|---------|---------------|--------|" >> "$MD_FILE"

echo "── join_group ──"
for size in "${MEMBER_SIZES[@]}"; do
  echo "  Creating group with $size members..."

  # Create a unique group
  GROUP_ID="bench-join-${size}-${TIMESTAMP}"
  now=$(date +%s)
  start_ts=$((now + 600))

  create_result=$(invoke_timed "$CONTRACT_ID" create_group \
    --admin "$DEPLOYER" \
    --group_id "$GROUP_ID" \
    --name "Benchmark Group" \
    --contribution_amount 100000000 \
    --total_members "$size" \
    --frequency Weekly \
    --start_timestamp "$start_ts" \
    --is_public true \
    --treasury "$DEPLOYER" \
    --token_address None)

  create_duration=$(echo "$create_result" | cut -d',' -f1)
  create_status=$(echo "$create_result" | cut -d',' -f2)

  echo "join_group,$size,$create_duration,$create_status" >> "$CSV_FILE"
  echo "| $size | $create_duration | $create_status |" >> "$MD_FILE"
  echo "    create_group: ${create_duration}ms ($create_status)"

  # Benchmark join operations
  if [ "$create_status" = "ok" ]; then
    for i in $(seq 1 $((size - 1))); do
      MEMBER_KEY="bench-member-${size}-${i}"
      stellar keys generate "$MEMBER_KEY" --network "$NETWORK" 2>/dev/null || true
      stellar keys fund "$MEMBER_KEY" --network "$NETWORK" 2>/dev/null || true
      member_addr=$(stellar keys address "$MEMBER_KEY" 2>/dev/null || echo "$DEPLOYER")

      join_result=$(invoke_timed "$CONTRACT_ID" join_group \
        --member "$member_addr" \
        --group_id "$GROUP_ID")

      join_duration=$(echo "$join_result" | cut -d',' -f1)
      join_status=$(echo "$join_result" | cut -d',' -f2)
      echo "join_group,$size,$join_duration,$join_status" >> "$CSV_FILE"
    done
    echo "    join_group x$((size - 1)): complete"
  fi
done

echo "" >> "$MD_FILE"

# ── Benchmark: contribute ────────────────────────────────────────────

echo "## contribute Benchmarks" >> "$MD_FILE"
echo "" >> "$MD_FILE"
echo "| Members | Duration (ms) | Status |" >> "$MD_FILE"
echo "|---------|---------------|--------|" >> "$MD_FILE"

echo ""
echo "── contribute ──"
for size in "${MEMBER_SIZES[@]}"; do
  echo "  Testing contribute with $size-member group..."

  GROUP_ID="bench-contrib-${size}-${TIMESTAMP}"
  now=$(date +%s)
  start_ts=$((now + 600))

  # Create group and fill it
  create_result=$(invoke_timed "$CONTRACT_ID" create_group \
    --admin "$DEPLOYER" \
    --group_id "$GROUP_ID" \
    --name "Benchmark Contrib Group" \
    --contribution_amount 100000000 \
    --total_members "$size" \
    --frequency Weekly \
    --start_timestamp "$start_ts" \
    --is_public true \
    --treasury "$DEPLOYER" \
    --token_address None)

  create_status=$(echo "$create_result" | cut -d',' -f2)

  if [ "$create_status" = "ok" ]; then
    # Join all members
    for i in $(seq 1 $((size - 1))); do
      MEMBER_KEY="bench-contrib-member-${size}-${i}"
      stellar keys generate "$MEMBER_KEY" --network "$NETWORK" 2>/dev/null || true
      stellar keys fund "$MEMBER_KEY" --network "$NETWORK" 2>/dev/null || true
      member_addr=$(stellar keys address "$MEMBER_KEY" 2>/dev/null || echo "$DEPLOYER")
      stellar contract invoke \
        --id "$CONTRACT_ID" \
        --source-account "$DEPLOYER" \
        --network "$NETWORK" \
        -- join_group --member "$member_addr" --group_id "$GROUP_ID" > /dev/null 2>&1 || true
    done

    # Benchmark contribute from admin (first member)
    contrib_result=$(invoke_timed "$CONTRACT_ID" contribute \
      --member "$DEPLOYER" \
      --group_id "$GROUP_ID")

    contrib_duration=$(echo "$contrib_result" | cut -d',' -f1)
    contrib_status=$(echo "$contrib_result" | cut -d',' -f2)

    echo "contribute,$size,$contrib_duration,$contrib_status" >> "$CSV_FILE"
    echo "| $size | $contrib_duration | $contrib_status |" >> "$MD_FILE"
    echo "    contribute: ${contrib_duration}ms ($contrib_status)"
  fi
done

echo "" >> "$MD_FILE"

# ── Summary ───────────────────────────────────────────────────────────

total_lines=$(tail -n +2 "$CSV_FILE" | wc -l | tr -d ' ')
echo "" >> "$MD_FILE"
echo "## Summary" >> "$MD_FILE"
echo "" >> "$MD_FILE"
echo "- **Total measurements:** $total_lines" >> "$MD_FILE"
echo "- **Output files:**" >> "$MD_FILE"
echo "  - CSV: \`$CSV_FILE\`" >> "$MD_FILE"
echo "  - Markdown: \`$MD_FILE\`" >> "$MD_FILE"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Benchmarking complete!                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Results saved to: $OUTPUT_DIR"
echo "  CSV:      $CSV_FILE"
echo "  Markdown: $MD_FILE"
