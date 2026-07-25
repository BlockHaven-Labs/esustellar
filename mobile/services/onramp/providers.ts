/**
 * Fiat On-Ramp Provider Configuration (#367)
 *
 * Supports WebView-based on-ramp providers that handle KYC/compliance
 * internally. The user is redirected to the provider's widget to complete
 * the purchase, then funds arrive in their Stellar wallet.
 */

export interface OnRampProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Supported fiat currencies */
  supportedFiat: string[];
  /** Base URL for the provider widget */
  widgetBaseUrl: string;
  /** Whether the provider handles KYC internally */
  handlesKyc: boolean;
}

export const ONRAMP_PROVIDERS: OnRampProvider[] = [
  {
    id: 'transak',
    name: 'Transak',
    icon: '💳',
    description: 'Buy XLM with card or bank transfer. KYC handled in-widget.',
    supportedFiat: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR'],
    widgetBaseUrl: 'https://global.transak.com',
    handlesKyc: true,
  },
  {
    id: 'moonpay',
    name: 'MoonPay',
    icon: '🌙',
    description: 'Purchase XLM using credit/debit cards worldwide.',
    supportedFiat: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
    widgetBaseUrl: 'https://buy.moonpay.com',
    handlesKyc: true,
  },
];

export interface OnRampWidgetParams {
  walletAddress: string;
  cryptoCurrency?: string;
  fiatCurrency?: string;
  fiatAmount?: number;
}

/**
 * Build the full widget URL for a given provider.
 * Each provider has its own query param structure.
 */
export function buildWidgetUrl(
  provider: OnRampProvider,
  params: OnRampWidgetParams,
): string {
  const { walletAddress, cryptoCurrency = 'XLM', fiatCurrency, fiatAmount } = params;

  if (provider.id === 'transak') {
    const query = new URLSearchParams({
      apiKey: getTransakApiKey(),
      cryptoCurrencyCode: cryptoCurrency,
      walletAddress,
      network: 'stellar',
      disableWalletAddressForm: 'true',
      themeColor: '6366F1',
      ...(fiatCurrency && { defaultFiatCurrency: fiatCurrency }),
      ...(fiatAmount && { defaultFiatAmount: String(fiatAmount) }),
    });
    return `${provider.widgetBaseUrl}?${query.toString()}`;
  }

  if (provider.id === 'moonpay') {
    const query = new URLSearchParams({
      apiKey: getMoonPayApiKey(),
      currencyCode: cryptoCurrency.toLowerCase(),
      walletAddress,
      colorCode: '%236366F1',
      ...(fiatCurrency && { baseCurrencyCode: fiatCurrency.toLowerCase() }),
      ...(fiatAmount && { baseCurrencyAmount: String(fiatAmount) }),
    });
    return `${provider.widgetBaseUrl}?${query.toString()}`;
  }

  return provider.widgetBaseUrl;
}

/**
 * API keys should come from environment config in production.
 * These are placeholder keys for the MVP prototype.
 */
function getTransakApiKey(): string {
  return process.env.EXPO_PUBLIC_TRANSAK_API_KEY || 'TRANSAK_STAGING_KEY';
}

function getMoonPayApiKey(): string {
  return process.env.EXPO_PUBLIC_MOONPAY_API_KEY || 'MOONPAY_STAGING_KEY';
}
