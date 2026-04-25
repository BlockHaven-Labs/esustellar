import AsyncStorage from '@react-native-async-storage/async-storage';

export type PerformanceMetric = {
  name: string;
  durationMs: number;
  recordedAt: string;
};

const PERFORMANCE_METRICS_KEY = 'esustellar_performance_metrics';

export async function recordPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PERFORMANCE_METRICS_KEY);
    const metrics = existing ? (JSON.parse(existing) as PerformanceMetric[]) : [];
    await AsyncStorage.setItem(PERFORMANCE_METRICS_KEY, JSON.stringify([...metrics, metric]));
    console.log(`[performance] ${metric.name}: ${metric.durationMs}ms`);
  } catch (error) {
    console.warn('[performance] failed to store metric', error);
  }
}

export async function logStartupMetric(durationMs: number): Promise<void> {
  await recordPerformanceMetric({
    name: 'app_startup',
    durationMs,
    recordedAt: new Date().toISOString(),
  });
}

export async function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  try {
    const stored = await AsyncStorage.getItem(PERFORMANCE_METRICS_KEY);
    return stored ? (JSON.parse(stored) as PerformanceMetric[]) : [];
  } catch {
    return [];
  }
}
