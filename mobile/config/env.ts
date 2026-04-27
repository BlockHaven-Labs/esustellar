/**
 * Centralised, validated application configuration.
 *
 * All values come from `EXPO_PUBLIC_*` environment variables so they are
 * inlined at build time by Expo's bundler and safe to read on the client.
 *
 * Environment files (loaded in priority order by Expo):
 *   .env.local          – local overrides (git-ignored)
 *   .env.<environment>  – e.g. .env.development / .env.staging / .env.production
 *   .env               – shared defaults
 *
 * Switch environments by setting APP_VARIANT in eas.json or via:
 *   npx expo start --env staging
 */

type Environment = 'development' | 'staging' | 'production';

interface AppConfig {
  /** Current runtime environment. */
  env: Environment;
  /** Base URL for the EsuStellar REST API. */
  apiUrl: string;
  /** Stellar network name ('testnet' | 'mainnet'). */
  stellarNetwork: string;
  /** Horizon server base URL. */
  stellarHorizonUrl: string;
  /** Stellar network passphrase used when signing transactions. */
  stellarNetworkPassphrase: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${key}. ` +
        'Copy .env.example to .env.local and fill in the values.',
    );
  }
  return value;
}

function parseEnvironment(raw: string | undefined): Environment {
  if (raw === 'staging' || raw === 'production') return raw;
  return 'development';
}

const config: AppConfig = {
  env: parseEnvironment(process.env.EXPO_PUBLIC_ENV),
  apiUrl: requireEnv('EXPO_PUBLIC_API_URL'),
  stellarNetwork: requireEnv('EXPO_PUBLIC_STELLAR_NETWORK'),
  stellarHorizonUrl: requireEnv('EXPO_PUBLIC_STELLAR_HORIZON_URL'),
  stellarNetworkPassphrase: requireEnv('EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE'),
};

/** Returns true when running against the development environment. */
export const isDev = (): boolean => config.env === 'development';
/** Returns true when running against the staging environment. */
export const isStaging = (): boolean => config.env === 'staging';
/** Returns true when running against the production environment. */
export const isProd = (): boolean => config.env === 'production';

export default config;
