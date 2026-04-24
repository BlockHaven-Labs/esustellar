export interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  isMobile: boolean;
  deepLink?: string;
  universalLink?: string;
}

export const WALLET_PROVIDERS: WalletProvider[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    icon: '/wallet-icons/freighter.svg',
    description: 'Stellar\'s flagship non-custodial wallet',
    isMobile: true,
    deepLink: 'freighter://',
    universalLink: 'https://www.freighter.app/'
  },
  {
    id: 'lobstr',
    name: 'Lobstr',
    icon: '/wallet-icons/lobstr.svg',
    description: 'Simple and secure Stellar wallet',
    isMobile: true,
    deepLink: 'lobstr://',
    universalLink: 'https://lobstr.co/'
  },
  {
    id: 'albedo',
    name: 'Albedo',
    icon: '/wallet-icons/albedo.svg',
    description: 'Browser-based wallet with mobile support',
    isMobile: true,
    universalLink: 'https://albedo.link/'
  }
];

export const getWalletProvider = (id: string): WalletProvider | undefined => {
  return WALLET_PROVIDERS.find(provider => provider.id === id);
};

export const getMobileWalletProviders = (): WalletProvider[] => {
  return WALLET_PROVIDERS.filter(provider => provider.isMobile);
};
