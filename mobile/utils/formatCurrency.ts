import * as Localization from 'expo-localization';

/** Returns the current device locale (BCP-47). Falls back to 'en'. */
const getLocale = (): string => Localization.locale ?? 'en';

/**
 * Formats a numeric amount as a localized currency string.
 *
 * @param amount  - The numeric value to format.
 * @param currency - ISO 4217 currency code (default: 'USD').
 * @param locale   - BCP 47 locale tag (defaults to device locale).
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale?: string,
): string {
  return new Intl.NumberFormat(locale ?? getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an XLM amount using the locale-appropriate decimal separator.
 *
 * @param amount  - The XLM amount.
 * @param locale  - BCP 47 locale tag (defaults to device locale).
 */
export function formatXLM(amount: number, locale?: string): string {
  return (
    new Intl.NumberFormat(locale ?? getLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    }).format(amount) + ' XLM'
  );
}

/**
 * Converts an XLM amount to a fiat equivalent string using a provided rate.
 *
 * @param xlmAmount - Amount in XLM.
 * @param rate      - Fiat price per 1 XLM.
 * @param currency  - ISO 4217 code for the fiat currency.
 * @param locale    - BCP 47 locale tag (defaults to device locale).
 */
export function xlmToFiat(
  xlmAmount: number,
  rate: number,
  currency = 'USD',
  locale?: string,
): string {
  return formatCurrency(xlmAmount * rate, currency, locale);
}
