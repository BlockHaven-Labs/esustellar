export function troopsToXLM(stroops: number | bigint | string): number {
  return Number(stroops) / 10_000_000
}

export function timestampToDate(ts: number): Date {
  return new Date(ts * 1000)
}

export function getDaysRemaining(deadlineTs: number): number {
  const nowTs = Math.floor(Date.now() / 1000)
  return Math.ceil((deadlineTs - nowTs) / 86400)
}
