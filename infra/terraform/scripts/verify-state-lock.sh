#!/usr/bin/env bash
# #998: Verifies that Terraform state locking is actually enforced by the
# DynamoDB lock table created by infra/terraform/state-bootstrap.
#
# It simulates a competing Terraform run that already holds the state lock,
# then asserts that a `terraform plan` against the same state key is blocked.
#
# Requirements:
#   - terraform >= 1.6
#   - aws cli with credentials for the account holding the state bucket/table
#
# Usage:
#   ./verify-state-lock.sh [ROOT]   # ROOT defaults to infra/terraform
set -euo pipefail

ROOT="${1:-infra/terraform}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
LOCK_TABLE="${LOCK_TABLE_NAME:-esustellar-terraform-locks}"
BUCKET="${STATE_BUCKET_NAME:-esustellar-terraform-state}"
STATE_KEY="${STATE_KEY:-infra/terraform.tfstate}"
# Optional: when the root uses a partial backend (backend "s3" {}), supply the
# per-environment config (e.g. BACKEND_CONFIG=backend/mainnet.hcl) so that
# `terraform init` knows the bucket/key/lock table. LOCK_TABLE_NAME, STATE_KEY
# and STATE_BUCKET_NAME must then match the values in that config.
BACKEND_CONFIG="${BACKEND_CONFIG:-}"

LOCK_ID="${BUCKET}/${STATE_KEY}"
PLAN_LOG="$(mktemp)"
export AWS_REGION="${REGION}"

cleanup() {
  echo "==> [cleanup] Releasing the simulated lock"
  aws dynamodb delete-item \
      --region "${REGION}" \
      --table-name "${LOCK_TABLE}" \
      --key "{\"LockID\": {\"S\": \"${LOCK_ID}\"}}" >/dev/null 2>&1 || true
  rm -f "${PLAN_LOG}" || true
}
trap cleanup EXIT

echo "==> [1/5] Initializing root: ${ROOT} (remote S3 backend)"
terraform -chdir="${ROOT}" init -input=false -backend=true -reconfigure
if [ -n "${BACKEND_CONFIG}" ]; then
  terraform -chdir="${ROOT}" init -input=false -backend=true -reconfigure -backend-config="${BACKEND_CONFIG}"
else
  terraform -chdir="${ROOT}" init -input=false -backend=true -reconfigure
fi

echo "==> [2/5] Confirming no lock is currently held on ${LOCK_ID}"
if aws dynamodb get-item \
    --region "${REGION}" \
    --table-name "${LOCK_TABLE}" \
    --key "{\"LockID\": {\"S\": \"${LOCK_ID}\"}}" \
    --query "Item" --output text 2>/dev/null | grep -q .; then
  echo "FAIL: a lock on ${LOCK_ID} is already present; refusing to run the test." >&2
  exit 1
fi

echo "==> [3/5] Simulating a competing operation that holds the lock"
LOCK_INFO="{\\\"Operation\\\":\\\"plan\\\",\\\"Who\\\":\\\"verify-state-lock.sh $$\\\"}"
aws dynamodb put-item \
    --region "${REGION}" \
    --table-name "${LOCK_TABLE}" \
    --item "{\"LockID\":{\"S\":\"${LOCK_ID}\"},\"Info\":{\"S\":\"${LOCK_INFO}\"}}"

echo "==> [4/5] Running terraform plan while the lock is held (must FAIL)"
set +e
terraform -chdir="${ROOT}" plan -input=false -no-color >"${PLAN_LOG}" 2>&1
status=$?
set -e

if [ "${status}" -eq 0 ]; then
  echo "FAIL: terraform plan succeeded while a competing lock was held." >&2
  sed -n '1,40p' "${PLAN_LOG}" >&2
  exit 1
fi

if ! grep -Eiq "acquiring the state lock|lock held by|inconsistent lock" "${PLAN_LOG}"; then
  echo "FAIL: terraform plan failed (exit ${status}) but not because of the lock:" >&2
  sed -n '1,40p' "${PLAN_LOG}" >&2
  exit 1
fi

echo "==> [5/5] PASS: state locking is enforced (plan was blocked while the lock was held)"