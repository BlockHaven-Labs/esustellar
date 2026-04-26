import { formatXLM } from '@/utils/stellar';

describe('formatXLM', () => {
  it('formats an integer amount with thousand separators and decimals', () => {
    expect(formatXLM(1234)).toBe('1,234.00 XLM');
  });

  it('formats a large amount with multiple separators', () => {
    expect(formatXLM(1000000.5)).toBe('1,000,000.50 XLM');
  });

  it('handles zero with fixed decimals', () => {
    expect(formatXLM(0)).toBe('0.00 XLM');
  });

  it('formats a decimal amount rounded to specified decimals', () => {
    expect(formatXLM(1.555, 2)).toBe('1.56 XLM');
    expect(formatXLM(1.5, 1)).toBe('1.5 XLM');
  });

  it('returns 0.00 XLM for NaN input', () => {
    // @ts-ignore - testing runtime NaN
    expect(formatXLM(NaN)).toBe('0.00 XLM');
    // @ts-ignore - testing runtime invalid string
    expect(formatXLM('abc' as any)).toBe('0.00 XLM');
  });

  it('handles negative numbers', () => {
    expect(formatXLM(-1234.5)).toBe('-1,234.50 XLM');
  });
});
