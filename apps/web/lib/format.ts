/**
 * Locale-aware date and number formatting helpers.
 *
 * Centralized so we don't have hard-coded `"en-US"` locale strings or
 * `toLocaleDateString()` calls scattered across the codebase. Passing
 * `undefined` to the `Intl.*` APIs uses the device locale, which is what
 * a user with a French browser locale (or any other) actually wants for
 * dates and decimal separators.
 *
 * See `BlockHaven-Labs/esustellar#179` for the original motivation.
 */

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

/**
 * Format a `Date` (or epoch ms / unix-seconds-as-bigint-or-number) for
 * display. Uses the device locale (`undefined` to `Intl.DateTimeFormat`)
 * so dates render in the user's expected layout (e.g. `04/24/2026` for
 * `en-US`, `24/04/2026` for `fr-FR`).
 *
 * Defaults to the short-month + day + year format that matches the
 * existing call sites in `activityFeed.ts` / `dashboard-stats.tsx`.
 * Pass `options` to override (e.g. `{ month: "short", day: "numeric" }`
 * to drop the year).
 */
export function formatDate(
  input: Date | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  const date = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Format an XLM amount with the device-locale's decimal separator. The
 * unit suffix (` XLM`) is appended verbatim. Caps fractional digits at
 * 2 by default, which matches the existing `formatXlm` / `formatXLM`
 * helpers this replaces.
 */
export function formatXLM(amount: number, maximumFractionDigits = 2): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits })} XLM`;
}

/**
 * Format a Soroban-style XLM stroop amount (1 XLM = 10_000_000 stroops).
 * Centralizes the conversion so both sides of the codebase agree on the
 * stroop denominator.
 */
export function formatXLMFromStroops(
  amount: bigint | number | string,
  maximumFractionDigits = 2
): string {
  const raw = BigInt(amount);
  const xlm = Number(raw) / 10_000_000;
  return formatXLM(xlm, maximumFractionDigits);
}
