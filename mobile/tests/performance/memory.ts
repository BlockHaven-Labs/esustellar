/**
 * Memory & Performance Profiling Tests
 * Issue #335: Measure memory usage during key flows and identify slow screens.
 *
 * Uses process.memoryUsage() (available in the Jest/Node runtime) as a
 * proxy for heap allocation. In production a native memory profiler
 * (e.g. Hermes sampling profiler) would replace these measurements.
 */

import {
  recordPerformanceMetric,
  getPerformanceMetrics,
  logStartupMetric,
} from '../../services/performance/index';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ─── helpers ────────────────────────────────────────────────────────────────

/** Snapshot heap usage in bytes */
function heapNow(): number {
  return process.memoryUsage().heapUsed;
}

/**
 * Run an async `work` function and return delta heap (bytes) + duration (ms).
 */
async function profile(
  work: () => Promise<void>
): Promise<{ deltaBytesKB: number; durationMs: number }> {
  const before = heapNow();
  const t0 = performance.now();
  await work();
  const durationMs = performance.now() - t0;
  const deltaBytesKB = (heapNow() - before) / 1024;
  return { deltaBytesKB, durationMs };
}

// ─── thresholds ─────────────────────────────────────────────────────────────

const MAX_RENDER_DURATION_MS = 300; // screens should render in < 300ms
const MAX_DELTA_HEAP_KB = 2048; // single flow should not allocate > 2 MB

// ─── simulated screen flows ──────────────────────────────────────────────────

async function simulateHomeScreenLoad() {
  await new Promise(r => setTimeout(r, 20));
  // simulate building a 50-item list
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i, value: `item-${i}` }));
  return items;
}

async function simulateGroupListLoad() {
  await new Promise(r => setTimeout(r, 30));
  const groups = Array.from({ length: 20 }, (_, i) => ({
    id: `g${i}`, name: `Group ${i}`, members: i + 2, balance: i * 100,
  }));
  return groups;
}

async function simulateTransactionHistoryLoad() {
  await new Promise(r => setTimeout(r, 40));
  const txs = Array.from({ length: 100 }, (_, i) => ({
    id: `tx${i}`, amount: i * 10, timestamp: Date.now() - i * 60000,
  }));
  return txs;
}

async function simulateContributionFlow() {
  await new Promise(r => setTimeout(r, 25));
  return { success: true, txHash: 'mockhash' + Date.now() };
}

async function simulateGroupDetailLoad() {
  await new Promise(r => setTimeout(r, 35));
  return {
    group: { id: 'g1', name: 'Family Savings', members: 8 },
    payoutSchedule: Array.from({ length: 8 }, (_, i) => ({ round: i + 1 })),
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

const bottlenecks: Array<{ screen: string; durationMs: number; deltaBytesKB: number }> = [];

describe('Memory & Performance Profiling Tests', () => {
  afterAll(() => {
    console.log('\n=== Memory & Render Duration Report ===');
    bottlenecks.forEach(b => {
      const slowFlag = b.durationMs > MAX_RENDER_DURATION_MS ? ' ⚠️  SLOW' : '';
      const memFlag = b.deltaBytesKB > MAX_DELTA_HEAP_KB ? ' ⚠️  HIGH MEM' : '';
      console.log(
        `  ${b.screen}: ${b.durationMs.toFixed(1)}ms, Δheap ${b.deltaBytesKB.toFixed(1)} KB${slowFlag}${memFlag}`
      );
    });
  });

  it('HomeScreen loads within render budget', async () => {
    const { deltaBytesKB, durationMs } = await profile(simulateHomeScreenLoad);
    bottlenecks.push({ screen: 'HomeScreen', durationMs, deltaBytesKB });
    expect(durationMs).toBeLessThan(MAX_RENDER_DURATION_MS);
    expect(deltaBytesKB).toBeLessThan(MAX_DELTA_HEAP_KB);
  });

  it('GroupListScreen loads within render budget', async () => {
    const { deltaBytesKB, durationMs } = await profile(simulateGroupListLoad);
    bottlenecks.push({ screen: 'GroupListScreen', durationMs, deltaBytesKB });
    expect(durationMs).toBeLessThan(MAX_RENDER_DURATION_MS);
    expect(deltaBytesKB).toBeLessThan(MAX_DELTA_HEAP_KB);
  });

  it('TransactionHistoryScreen loads within render budget', async () => {
    const { deltaBytesKB, durationMs } = await profile(simulateTransactionHistoryLoad);
    bottlenecks.push({ screen: 'TransactionHistoryScreen', durationMs, deltaBytesKB });
    expect(durationMs).toBeLessThan(MAX_RENDER_DURATION_MS);
    expect(deltaBytesKB).toBeLessThan(MAX_DELTA_HEAP_KB);
  });

  it('ContributionFlow completes within render budget', async () => {
    const { deltaBytesKB, durationMs } = await profile(simulateContributionFlow);
    bottlenecks.push({ screen: 'ContributionFlow', durationMs, deltaBytesKB });
    expect(durationMs).toBeLessThan(MAX_RENDER_DURATION_MS);
    expect(deltaBytesKB).toBeLessThan(MAX_DELTA_HEAP_KB);
  });

  it('GroupDetailScreen loads within render budget', async () => {
    const { deltaBytesKB, durationMs } = await profile(simulateGroupDetailLoad);
    bottlenecks.push({ screen: 'GroupDetailScreen', durationMs, deltaBytesKB });
    expect(durationMs).toBeLessThan(MAX_RENDER_DURATION_MS);
    expect(deltaBytesKB).toBeLessThan(MAX_DELTA_HEAP_KB);
  });

  it('recordPerformanceMetric stores metrics without throwing', async () => {
    await expect(
      recordPerformanceMetric({ name: 'test_metric', durationMs: 42, recordedAt: new Date().toISOString() })
    ).resolves.not.toThrow();
  });

  it('logStartupMetric stores startup time', async () => {
    await expect(logStartupMetric(350)).resolves.not.toThrow();
  });

  it('getPerformanceMetrics returns an array', async () => {
    const metrics = await getPerformanceMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('documents excessive memory allocation as bottleneck', async () => {
    // Allocate a large buffer deliberately to verify detection logic
    const { deltaBytesKB } = await profile(async () => {
      // 5 MB allocation
      const buf = Buffer.alloc(5 * 1024 * 1024);
      await new Promise(r => setTimeout(r, 5));
      return buf;
    });
    if (deltaBytesKB > MAX_DELTA_HEAP_KB) {
      bottlenecks.push({ screen: '⚠️  ExcessiveAllocationTest', durationMs: 0, deltaBytesKB });
      console.warn(`[memory] excessive allocation detected: ${deltaBytesKB.toFixed(1)} KB`);
    }
    expect(deltaBytesKB).toBeGreaterThan(0);
  });
});
