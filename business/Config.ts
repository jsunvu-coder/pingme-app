// config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
let ENV: EnvName = 'staging';

type EnvName = 'staging' | 'production';

export const ENV_STORAGE_KEY = '@pingme_env';

const CONFIG = {
  staging: {
    API_URL: 'https://api.staging.pingme.xyz',
    APP_URL: 'https://app.staging.pingme.xyz',
  },
  production: {
    API_URL: 'https://api.pingme.xyz',
    APP_URL: 'https://app.pingme.xyz',
  },
};

export let API_URL = CONFIG[ENV].API_URL;
export let APP_URL = CONFIG[ENV].APP_URL;

const applyEnv = (env: EnvName) => {
  ENV = env;
  API_URL = CONFIG[ENV].API_URL;
  APP_URL = CONFIG[ENV].APP_URL;
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

export const loadEnvFromStorage = async (): Promise<EnvName> => {
  try {
    const stored = (await AsyncStorage.getItem(ENV_STORAGE_KEY)) as EnvName | null;
    if (stored === 'production' || stored === 'staging') {
      applyEnv(stored);
    }
  } catch (err) {
    console.warn('[Config] Failed to load stored env', err);
  }
  return ENV;
};

export const EXPIRY_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
export const PAGINATION = 8; // 8 entries per account record pagination
export const SKIP_PASSPHRASE = 10;
export const SHOW_USD = true;
export const UPDATE_DELAY = 3 * 1000; // 3 seconds
export const TOC_URL = 'https://pingme.xyz/toc';
