# 🛡️ Mainnet Multi-Signature Strategy & Governance Runbook

This document details the multi-signature governance framework for managing admin and upgrade authorities over the PropChain and SoroTask smart contracts on Stellar Mainnet.

## 1. Architectural Signer Topology
To secure administrative actions without introducing single points of failure (SPOF) or creating operational deadlocks, we enforce a native **3-of-5 Core Administrative Key Configuration**.

* **Low Threshold (`1`)**: Routine operations, low-risk query updates, or non-state parameter tracking.
* **Medium Threshold (`3`)**: Operational interactions, manual ledger adjustments, asset unfreezing.
* **High Threshold (`3`)**: Structural contract upgrades, core state pauses, and signer configuration modifications.

### Signer Allocation Blueprint
| Custodian Role | Initial Weight | Notes / Security Profile |
| :--- | :---: | :--- |
| **Master Admin Account** (`GA_ADMIN...`) | `0` *(Revoked)* | Anchor Account (Private Key completely zeroed out post-setup) |
| **Signer A** (Engineering Lead Core) | `1` | Cold-storage air-gapped wallet |
| **Signer B** (Security Infrastructure) | `1` | Hardware security module (HSM) |
| **Signer C** (Executive Management Key) | `1` | Corporate governance key |
| **Signer D** (DevOps Release Agent) | `1` | Automated CI/CD execution pipeline worker |
| **Signer E** (Independent Custodian) | `1` | External auditing/compliance third party |

---

## 2. Shell Bootstrapping Playbook
Run this sequence once during deployment initialization to permanently transfer ownership of the master account to the multi-sig quorum.

```bash
#!/usr/bin/env bash
set -euo pipefail

ADMIN_ACCOUNT_PUBLIC="GD_ADMIN_BASE_ANCHOR_PUBLIC_KEY"
NETWORK_PASSPHRASE="Public Global Stellar Network ; October 2015"

echo "[GOVERNANCE] Building multi-signature authorization bounds..."

# 1. Map custodian weights onto the anchor identity
stellar-cli tx set-options \
    --source-secret "$ADMIN_ACCOUNT_PUBLIC" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --add-signer "GD_SIGNER_A_PUBLIC_KEY:1" \
    --add-signer "GD_SIGNER_B_PUBLIC_KEY:1" \
    --add-signer "GD_SIGNER_C_PUBLIC_KEY:1" \
    --add-signer "GD_SIGNER_D_PUBLIC_KEY:1" \
    --add-signer "GD_SIGNER_E_PUBLIC_KEY:1"

# 2. Enforce strict thresholds and deprecate original master seed key access
stellar-cli tx set-options \
    --source-secret "$ADMIN_ACCOUNT_PUBLIC" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --master-weight 0 \
    --low-threshold 1 \
    --med-threshold 3 \
    --high-threshold 3

echo "[SUCCESS] Multi-sig orchestration finalized. Master key weight dropped to 0."