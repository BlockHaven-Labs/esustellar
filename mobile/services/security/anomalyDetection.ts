export type ContributionRecord = {
  amount: number;
  timestamp: number;
  source: string;
};

export function detectSuspiciousActivity(records: ContributionRecord[]) {
  const warnings: string[] = [];

  if (records.length < 2) return warnings;

  const recent = records.slice(-5);

  const repeatedRapidTransactions = recent.filter(
    (r, i, arr) =>
      i > 0 &&
      r.timestamp - arr[i - 1].timestamp < 60000
  );

  if (repeatedRapidTransactions.length >= 3) {
    warnings.push('Multiple rapid contributions detected.');
  }

  const unusuallyLarge = recent.some((r) => r.amount > 100000);

  if (unusuallyLarge) {
    warnings.push('Unusually large contribution detected.');
  }

  return warnings;
}
