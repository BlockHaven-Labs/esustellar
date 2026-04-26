/**
 * Truncates a Stellar address to the format GXXX...XXXX.
 * Returns the original string if it is too short to truncate.
 */
export function truncateAddress(address: string, leading = 4, trailing = 4): string {
  if (address.length <= leading + trailing) return address;
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
}

/**
 * Formats a numeric amount into a consistent XLM display format.
 * Includes thousand separators, a fixed number of decimals, and an ' XLM' suffix.
 * 
 * @param amount The numeric amount to format
 * @param decimals The number of decimal places (default 2)
 * @returns A formatted string e.g., "1,234.50 XLM"
 */
export function formatXLM(amount: number, decimals = 2): string {
  const value = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  
  const parts = value.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `${parts.join('.')} XLM`;
}
