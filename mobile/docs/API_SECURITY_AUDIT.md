# API Security Audit Report

This document outlines the findings and recommendations from the security audit performed on the EsuStellar mobile application's API communication, credential storage, logging practices, and authentication flows.

---

## 🔍 Executive Summary of Findings

| Category | Finding | Severity | Recommendation | Status |
|----------|---------|----------|----------------|--------|
| **Secret Storage** | Seed phrases and secret keys stored in `expo-secure-store`. | ✅ **Secure** | Keep using Secure Store; ensure keys are deleted on wallet removal. | Resolved |
| **Public Metadata** | Wallet public keys and labels stored in `AsyncStorage`. | ✅ **Secure** | Acceptable as public keys are not secrets. | Resolved |
| **Console Logs** | Raw `console.log` used in API files instead of custom logger, leaking endpoints and request states. | ⚠️ **Medium** | Migrate all console calls to the custom `logger` class. | Pending Action |
| **SSL Pinning** | SSL Pinning / Certificate Validation is NOT configured. vulnerable to Man-in-the-Middle (MitM) attacks. | 🚨 **High** | Implement SSL pinning for API and Stellar Horizon endpoints. | Action Required |
| **API Authentication** | Mock endpoints accept raw `userAddress` parameter without cryptographic verification or JWT tokens. | 🚨 **High** | Implement cryptographic challenge-response JWT authentication flow. | Action Required |

---

## 🛠️ Detailed Findings & Analysis

### 1. Token & Secret Storage Review
- **Private Credentials (Seed Phrases / Secret Keys):**
  - **Location:** `mobile/services/wallet/multiWallet.ts`
  - **Storage:** Persisted securely using `expo-secure-store` via `SecureStore.setItemAsync`.
  - **Verdict:** Secure. On iOS, this uses the Keychain; on Android, it uses AES-GCM-256 encryption in the KeyStore.
- **Public Credentials (Public Keys / Wallet Names):**
  - **Location:** `mobile/store/authStore.ts` and `mobile/services/wallet/multiWallet.ts`
  - **Storage:** Persisted in `AsyncStorage` under `multiWallet:list` and `multiWallet:activeId`.
  - **Verdict:** Secure. Storing public keys in plaintext is standard since public keys are intended to be public.

### 2. Sensitive Data in Logs Review
- **The Issue:**
  - `mobile/services/api/groupsApi.ts` utilizes raw `console.log` statements (e.g. `console.log("Joining group with invite code: " + inviteCode)`).
  - In React Native production builds, standard `console.log` statements are not automatically stripped unless specified in the bundler config (e.g. babel-plugin-transform-remove-console), meaning they can leak endpoints, IDs, or inputs to device logs.
  - The custom `Logger` class in `mobile/services/logger/index.ts` has a check `const IS_PROD = process.env.NODE_ENV === 'production'` that disables `debug` and `info` logs, but raw `console.log` calls bypass this layout entirely.
- **Action Items:**
  - Replace all occurrences of `console.log`, `console.warn`, and `console.error` with `logger.debug`, `logger.warn`, or `logger.error` from the custom logger service.
  - Add a Babel plugin or Metro config strip step for all `console.*` logs in production.

### 3. SSL Pinning & Certificate Validation
- **The Issue:**
  - The mobile app makes standard HTTP requests using the global `fetch` API to interact with `https://api.esustellar.com` and Stellar Horizon nodes.
  - No SSL pinning configuration or certificate validation is present in the codebase.
  - This exposes the mobile app to SSL hijacking, DNS poisoning, and local proxy interception (e.g. tools like Charles Proxy or Fiddler), allowing attackers to intercept transactions or fake payouts.
- **Action Items:**
  - Integrate a package like `expo-ssl-pinning` or `react-native-ssl-pinning` to enforce certificate pinning for `api.esustellar.com` and target Stellar network node endpoints.
  - Implement certificate hash rotation in the build pipeline to prevent app lockout when server SSL certificates renew.

### 4. API Authentication Flow
- **The Issue:**
  - Current API structures (e.g., `groupsApi.getUserGroups(userAddress)`) authenticate users purely by passing their public address string.
  - Since there is no token (`Authorization: Bearer <JWT>`) or cryptographic signature validation, any user can access or edit records of other users by simply changing the public key string.
- **Action Items:**
  - Move from address-based parameters to JWT-based authentication.
  - **Proposed Cryptographic Login Flow:**
    1. **Challenge Request:** The mobile app calls `/auth/challenge?address=GB...` to fetch a unique, timed challenge message (nonce).
    2. **Local Signing:** The mobile app signs the challenge message with the user's private key (securely retrieved from `SecureStore`).
    3. **Verification:** The signed challenge is sent to `/auth/verify` where the backend verifies the signature using the user's public address.
    4. **Session Token:** The backend issues a JWT access token (short-lived) and refresh token (long-lived).
    5. **Token Storage:** The JWT access and refresh tokens are stored securely in `expo-secure-store` and sent via `Authorization: Bearer <token>` headers on all subsequent requests.
