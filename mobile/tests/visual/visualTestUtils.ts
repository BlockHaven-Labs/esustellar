/**
 * Visual Test Utilities
 * Issue #336: Shared helpers for screenshot capture and baseline comparison.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── types ───────────────────────────────────────────────────────────────────

export interface ScreenProps {
  [key: string]: unknown;
}

export interface Screenshot {
  screen: string;
  props: ScreenProps;
  hash: string;
  capturedAt: string;
}

export interface CompareResult {
  matched: boolean;
  diff: string[];
}

// ─── screen definitions ──────────────────────────────────────────────────────

export interface ScreenDef {
  name: string;
  render: () => ScreenProps;
}

export const SCREENS: ScreenDef[] = [
  {
    name: 'HomeScreen',
    render: () => ({
      walletConnected: false,
      groups: [],
      balance: '0.0000000',
    }),
  },
  {
    name: 'GroupsListScreen',
    render: () => ({
      groups: [
        { id: 'g1', name: 'Family Savings', members: 4 },
        { id: 'g2', name: 'Investment Club', members: 6 },
      ],
      isLoading: false,
    }),
  },
  {
    name: 'GroupDetailScreen',
    render: () => ({
      group: { id: 'g1', name: 'Family Savings', contributionAmount: 100, maxMembers: 8 },
      myContributions: 3,
      nextPayout: '2025-08-01',
    }),
  },
  {
    name: 'TransactionHistoryScreen',
    render: () => ({
      transactions: [
        { id: 't1', type: 'contribution', amount: 100, date: '2025-01-15' },
        { id: 't2', type: 'payout', amount: 800, date: '2025-02-01' },
      ],
    }),
  },
  {
    name: 'OnboardingScreen',
    render: () => ({
      step: 1,
      totalSteps: 3,
      title: 'Welcome to EsuStellar',
    }),
  },
];

// ─── baseline storage ────────────────────────────────────────────────────────

const BASELINE_DIR = path.join(__dirname, '__baselines__');

function baselinePath(screenName: string): string {
  return path.join(BASELINE_DIR, `${screenName}.json`);
}

function ensureBaselineDir() {
  if (!fs.existsSync(BASELINE_DIR)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Capture a deterministic "screenshot" as a hashed JSON snapshot of props.
 */
export function captureScreenshot(screenName: string, props: ScreenProps): Screenshot {
  const serialized = JSON.stringify(props, Object.keys(props).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  return {
    screen: screenName,
    props,
    hash,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Compare a screenshot to the stored baseline.
 * Creates the baseline if one does not exist (first-run behaviour).
 */
export function compareToBaseline(screenName: string, screenshot: Screenshot): CompareResult {
  ensureBaselineDir();
  const filePath = baselinePath(screenName);

  if (!fs.existsSync(filePath)) {
    // First run: write baseline
    fs.writeFileSync(filePath, JSON.stringify(screenshot, null, 2));
    return { matched: true, diff: [] };
  }

  const baseline: Screenshot = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (baseline.hash === screenshot.hash) {
    return { matched: true, diff: [] };
  }

  // Produce a human-readable diff of the props
  const diff = diffProps(baseline.props, screenshot.props);
  return { matched: false, diff };
}

function diffProps(baseline: ScreenProps, current: ScreenProps): string[] {
  const lines: string[] = [];
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);

  for (const key of allKeys) {
    const bVal = JSON.stringify(baseline[key]);
    const cVal = JSON.stringify(current[key]);
    if (bVal !== cVal) {
      lines.push(`  ${key}: baseline=${bVal}  current=${cVal}`);
    }
  }
  return lines;
}
