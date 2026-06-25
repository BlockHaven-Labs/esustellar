# Storage Security Audit Findings

## Objective
Identify all sensitive data stored locally and ensure secure storage mechanisms are used.

## Findings

1. **PIN Storage (`services/security/pinService.ts`)**:
   - **Data Stored**: PIN salt and SHA256 hash.
   - **Mechanism**: `expo-secure-store`.
   - **Verdict**: Secure. The app correctly utilizes secure enclaves to store the encrypted PIN data.
   - **Note**: The lockout state and failed attempts are stored in `AsyncStorage`. This is non-sensitive metadata and is acceptable for plain storage as it cannot be used to extract the PIN.

2. **Wallet Storage (`stores/walletStore.ts` & `store/authStore.ts`)**:
   - **Data Stored**: Wallet addresses (public keys), wallet type, and connection status.
   - **Mechanism**: `AsyncStorage` (via Zustand persist).
   - **Verdict**: Acceptable. Public keys are public by definition and do not pose a direct security risk if extracted. Private keys are never stored in `AsyncStorage`.

3. **Authentication Session**:
   - **Data Stored**: Session timestamps and active status.
   - **Mechanism**: `AsyncStorage`.
   - **Verdict**: Acceptable. It does not store raw JWTs or auth tokens in plaintext.

## Resolution
- Verified the use of `expo-secure-store` for the PIN.
- Verified that no plaintext secrets (private keys, mnemonics) are stored in `AsyncStorage`.
- The current implementation meets high-security standards for local mobile storage. No migrations from `AsyncStorage` to `SecureStore` were necessary because sensitive secrets are not exposed.
