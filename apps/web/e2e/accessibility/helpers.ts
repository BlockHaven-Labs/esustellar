/**
 * Shared helpers for axe-core/playwright accessibility audits.
 *
 * All helpers enforce WCAG 2.1 AA compliance and write structured findings to
 * the a11y-report.json artifact uploaded by CI.
 */

import { Page, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as fs from "fs";
import * as path from "path";

/** WCAG 2.1 AA tags that every audit must check. */
export const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface A11yFinding {
  flow: string;
  url: string;
  timestamp: string;
  violations: import("axe-core").Result[];
  passes: number;
  incomplete: number;
}

const reportPath = path.resolve(__dirname, "../../a11y-report.json");

/** Append findings from a single page audit to the shared report file. */
export function appendFinding(finding: A11yFinding): void {
  let existing: A11yFinding[] = [];
  if (fs.existsSync(reportPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    } catch {
      existing = [];
    }
  }
  existing.push(finding);
  fs.writeFileSync(reportPath, JSON.stringify(existing, null, 2), "utf-8");
}

/**
 * Run an axe WCAG 2.1 AA audit on the current page.
 *
 * @param page     Playwright page object
 * @param flowName Human-readable name for this flow (used in the report)
 * @param options  Optional AxeBuilder configuration (e.g. exclude selectors)
 */
export async function auditPage(
  page: Page,
  flowName: string,
  options?: {
    exclude?: string[];
    include?: string[];
    disableRules?: string[];
  }
): Promise<import("axe-core").AxeResults> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);

  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }
  if (options?.include) {
    for (const selector of options.include) {
      builder = builder.include(selector);
    }
  }
  if (options?.disableRules) {
    builder = builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();

  appendFinding({
    flow: flowName,
    url: page.url(),
    timestamp: new Date().toISOString(),
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  });

  return results;
}

/**
 * Mock a connected Freighter wallet so pages that gate content behind
 * `isConnected` render their real (post-connect) UI in CI, where no browser
 * extension is installed.
 *
 * Freighter's extension communicates with the page via window.postMessage
 * (source: "FREIGHTER_EXTERNAL_MSG_REQUEST" / "FREIGHTER_EXTERNAL_MSG_RESPONSE",
 * correlated by a "messagedId" field - see @stellar/freighter-api's
 * extensionMessaging helper). This replays that protocol with static
 * responses. Must be called before page.goto().
 */
const MOCK_PUBLIC_KEY = "GTESTWALLETPUBLICKEYMOCKEDFORACCESSIBILITYTESTINGXXXXXXX";

export async function mockConnectedWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ publicKey }) => {
      // Short-circuits @stellar/freighter-api's hasFreighterHint()/isConnected() checks.
      (window as unknown as { freighter: boolean }).freighter = true;

      window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        const data = event.data as { source?: string; messageId?: number; type?: string };
        if (data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;

        const base = { source: "FREIGHTER_EXTERNAL_MSG_RESPONSE", messagedId: data.messageId };
        let payload: Record<string, unknown> = {};
        switch (data.type) {
          case "REQUEST_ACCESS":
          case "REQUEST_PUBLIC_KEY":
            payload = { publicKey };
            break;
          case "REQUEST_CONNECTION_STATUS":
          case "REQUEST_ALLOWED_STATUS":
            payload = { isConnected: true, isAllowed: true };
            break;
          case "REQUEST_NETWORK":
            payload = {
              network: "TESTNET",
              networkPassphrase: "Test SDF Network ; September 2015",
            };
            break;
          case "REQUEST_NETWORK_DETAILS":
            payload = {
              networkDetails: {
                network: "TESTNET",
                networkPassphrase: "Test SDF Network ; September 2015",
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
    },
    { publicKey: MOCK_PUBLIC_KEY }
  );
}

/**
 * Assert that no WCAG 2.1 AA violations are present.
 * Provides a readable failure message that lists every violation found.
 */
export function expectNoViolations(
  results: import("axe-core").AxeResults,
  flowName: string
): void {
  if (results.violations.length === 0) return;

  const summary = results.violations
    .map(
      (v, i) =>
        `[${i + 1}] ${v.id} (${v.impact ?? "unknown"} impact): ${v.description}\n` +
        `    Help: ${v.helpUrl}\n` +
        `    Nodes affected: ${v.nodes.length}\n` +
        v.nodes
          .slice(0, 3)
          .map((n) => `      - ${n.html}`)
          .join("\n")
    )
    .join("\n\n");

  expect(
    results.violations,
    `WCAG 2.1 AA violations found in "${flowName}":\n\n${summary}`
  ).toHaveLength(0);
}
