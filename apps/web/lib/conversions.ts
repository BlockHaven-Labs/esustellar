export const xlmToStroops = (xlm: number): bigint => {
  return BigInt(Math.floor(xlm * 10_000_000));
};

export const dateToTimestamp = (date: string): number => {
  return Math.floor(new Date(date).getTime() / 1000);
};

export const frequencyMap = {
  weekly: 'Weekly',
  biweekly: 'BiWeekly',
  monthly: 'Monthly',
} as const;
