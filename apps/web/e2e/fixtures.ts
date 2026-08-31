/**
 * Shared seed data / fixtures used across Playwright E2E tests.
 *
 * These values are deterministic so that tests are reproducible.
 * No real blockchain connectivity is required — contract calls are
 * intercepted or mocked at the window level.
 */

/** A mock Stellar public key (G-address, valid checksum format). */
export const MOCK_PUBLIC_KEY =
  "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";

/** A second mock address used when a different member is needed. */
export const MOCK_MEMBER_KEY =
  "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4B5X6E6B7YZWSRLNQRB";

/** A pre-created group ID used in join / contribute tests. */
export const MOCK_GROUP_ID = "grp_1234567890_abcdef";

/** A second group ID for list-view tests. */
export const MOCK_GROUP_ID_2 = "grp_9876543210_fedcba";

/** Default contribution amount in XLM. */
export const DEFAULT_CONTRIBUTION_XLM = 50;

/** Testnet network passphrase expected by the app. */
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * A lightweight mock of the Freighter browser extension object.
 *
 * Injected via `page.addInitScript` so that `walletConfig.ts` perceives
 * Freighter as installed and already connected.
 *
 * The mock surface matches what `@stellar/freighter-api` reads from `window`:
 *   - `window.freighter` — presence flag used by `hasFreighterHint()`
 *   - `window.freighterApi` — API object checked as fallback
 *
 * Because the actual API calls go through `@stellar/freighter-api` (which
 * communicates via `postMessage`), we also stub the message handler so that
 * ping / getAddress / requestAccess all resolve immediately.
 */
export const freighterMockScript = (publicKey: string, passphrase: string) => `
  // Mark extension as present
  window.freighter = true;

  // Stub the postMessage-based Freighter protocol so the ping resolves.
  const _origAddEventListener = window.addEventListener.bind(window);
  window.addEventListener = function(type, handler, ...rest) {
    if (type === 'message') {
      // Wrap the handler to auto-reply to FREIGHTER_EXTERNAL_MSG_REQUEST pings.
      const wrapped = function(event) {
        if (
          event.data &&
          event.data.source === 'FREIGHTER_EXTERNAL_MSG_REQUEST'
        ) {
          // Reply immediately so pingFreighter() resolves true.
          window.postMessage(
            {
              source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE',
              messageId: event.data.messageId,
              messagedId: event.data.messageId,
            },
            window.location.origin
          );
        }
        return handler.call(this, event);
      };
      return _origAddEventListener(type, wrapped, ...rest);
    }
    return _origAddEventListener(type, handler, ...rest);
  };

  // Stub @stellar/freighter-api module internals via globalThis so that
  // higher-level wrappers (isConnected, getAddress, requestAccess, etc.)
  // get predictable responses without hitting the extension.
  window.__freighterMock = {
    publicKey: ${JSON.stringify(publicKey)},
    passphrase: ${JSON.stringify(passphrase)},
    isConnected: true,
  };
`;

/**
 * A robust Freighter mock that fully connects the wallet by replying to the
 * postMessage protocol used by @stellar/freighter-api's extensionMessaging
 * (REQUEST_ACCESS / REQUEST_PUBLIC_KEY / REQUEST_CONNECTION_STATUS /
 * REQUEST_ALLOWED_STATUS / REQUEST_NETWORK / REQUEST_NETWORK_DETAILS).
 *
 * Unlike freighterMockScript (which only auto-answers the ping handshake so
 * the extension registers as "installed" but never returns a public key),
 * this mock actually simulates a connected wallet so pages that gate content
 * behind `isConnected` (e.g. the /create wizard) render their real UI.
 *
 * Must be injected before page.goto() via addInitScript.
 */
export const mockConnectedWalletScript = (publicKey: string, passphrase: string) => `
  window.freighter = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;

    const base = { source: "FREIGHTER_EXTERNAL_MSG_RESPONSE", messagedId: data.messageId };
    let payload = {};
    switch (data.type) {
      case "REQUEST_ACCESS":
      case "REQUEST_PUBLIC_KEY":
        payload = { publicKey: ${JSON.stringify(publicKey)} };
        break;
      case "REQUEST_CONNECTION_STATUS":
      case "REQUEST_ALLOWED_STATUS":
        payload = { isConnected: true, isAllowed: true };
        break;
      case "REQUEST_NETWORK":
        payload = { network: "TESTNET", networkPassphrase: ${JSON.stringify(passphrase)} };
        break;
      case "REQUEST_NETWORK_DETAILS":
        payload = {
          networkDetails: {
            network: "TESTNET",
            networkPassphrase: ${JSON.stringify(passphrase)},
            networkUrl: "https://horizon-testnet.stellar.org",
            sorobanRpcUrl: "https://soroban-testnet.stellar.org",
          },
        };
        break;
      default:
        return;
    }

    window.postMessage({ ...base, ...payload }, window.location.origin);
  });
`;

/**
 * Seed data for a valid create-group form submission.
 *
 * Using a date one year in the future ensures the "must be future date"
 * validation never fails due to clock drift.
 */
export function createGroupFormData(overrides?: Partial<{
  name: string;
  description: string;
  amount: string;
  members: string;
  frequency: string;
  startDate: string;
}>) {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const isoDate = oneYearFromNow.toISOString().split("T")[0]; // YYYY-MM-DD

  return {
    name: "Lagos Professionals",
    description: "A test savings group for E2E automation",
    amount: "50",
    members: "5",
    frequency: "Monthly",
    startDate: isoDate,
    ...overrides,
  };
}

/** Mock group objects that the registry contract would return. */
export const MOCK_GROUPS = [
  {
    id: MOCK_GROUP_ID,
    name: "Lagos Professionals",
    contributionAmount: 50,
    frequency: "Monthly",
    totalMembers: 5,
    currentMembers: 3,
    status: "Open",
    currentRound: 1,
    nextPayout: "—",
  },
  {
    id: MOCK_GROUP_ID_2,
    name: "Nairobi Savers",
    contributionAmount: 100,
    frequency: "Weekly",
    totalMembers: 8,
    currentMembers: 8,
    status: "Active",
    currentRound: 2,
    nextPayout: "—",
  },
];
