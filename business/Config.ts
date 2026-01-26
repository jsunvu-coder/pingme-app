// config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type EnvName = 'staging' | 'production';

export const ENV_STORAGE_KEY = '@pingme_env';

const CONFIG = {
  staging: {
    API_URL: 'https://api.staging.pingme.xyz',
    APP_URL: 'https://app.staging.pingme.xyz',
    RED_POCKET_API_URL: 'https://redpocket.staging.pingme.xyz/',
  },
  production: {
    API_URL: 'https://api.pingme.xyz',
    APP_URL: 'https://app.pingme.xyz',
    RED_POCKET_API_URL: 'https://redpocket.pingme.xyz/',
  },
};

/**
 * Get build-time environment from EXPO_PUBLIC_ENV
 * This is set during build via eas.json or EXPO_PUBLIC_ENV env var
 * Defaults to 'production' for production builds
 */
const getBuildTimeEnv = (): EnvName => {
  // @ts-ignore - EXPO_PUBLIC_ENV is injected at build time by Expo
  const buildEnv = process.env.EXPO_PUBLIC_ENV;
  if (buildEnv === 'production' || buildEnv === 'staging') {
    return buildEnv;
  }
  // Default to production for production builds, staging for dev
  return 'staging';
};

// Initialize ENV from build-time environment
export let ENV: EnvName = getBuildTimeEnv();
export let API_URL = CONFIG[ENV].API_URL;
export let APP_URL = CONFIG[ENV].APP_URL;
export let RED_POCKET_API_URL = CONFIG[ENV].RED_POCKET_API_URL;

const applyEnv = (env: EnvName) => {
  ENV = env;
  API_URL = CONFIG[ENV].API_URL;
  APP_URL = CONFIG[ENV].APP_URL;
  console.log(`[Config] Environment set to: ${ENV}`, {
    API_URL,
    APP_URL,
  });
};

export const getEnv = (): EnvName => ENV;

export const setEnv = async (env: EnvName): Promise<EnvName> => {
  applyEnv(env);
  try {
    await AsyncStorage.setItem(ENV_STORAGE_KEY, env);
  } catch (err) {
    console.warn('[Config] Failed to persist env', err);
  }
  return ENV;
};

/**
 * Load environment from storage, respecting build-time environment as default.
 * This allows:
 * - Production builds to default to production API (from EXPO_PUBLIC_ENV)
 * - Staging builds to default to staging API (from EXPO_PUBLIC_ENV)
 * - Users with @hailstonelabs.com email to override via settings
 */
export const loadEnvFromStorage = async (): Promise<EnvName> => {
  const buildTimeEnv = getBuildTimeEnv();

  try {
    const stored = (await AsyncStorage.getItem(ENV_STORAGE_KEY)) as EnvName | null;
    if (stored === 'production' || stored === 'staging') {
      // User has explicitly set an environment, use it
      applyEnv(stored);
      console.log(`[Config] Loaded environment from storage: ${stored}`);
    } else {
      // No stored preference, use build-time environment
      applyEnv(buildTimeEnv);
      console.log(`[Config] Using build-time environment: ${buildTimeEnv}`);
    }
  } catch (err) {
    console.warn('[Config] Failed to load stored env', err);
    // Fallback to build-time environment
    applyEnv(buildTimeEnv);
  }
  return ENV;
};

export const EXPIRY_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
export const PAGINATION = 15; // 8 entries per account record pagination
export const SKIP_PASSPHRASE = 10;
export const SHOW_USD = true;
export const UPDATE_DELAY = 3 * 1000; // 3 seconds
export const TOC_URL = 'https://pingmexyz.gitbook.io/docs/legal/terms-of-use';
