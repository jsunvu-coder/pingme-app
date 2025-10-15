// config.ts
const ENV = "staging"; // or "production"

const CONFIG = {
  staging: {
    API_URL: "https://api.staging.pingme.xyz",
    APP_URL: "https://app.staging.pingme.xyz",
  },
  production: {
    API_URL: "https://api.pingme.xyz",
    APP_URL: "https://app.pingme.xyz",
  },
};

export const API_URL = CONFIG[ENV].API_URL;
export const URL = CONFIG[ENV].APP_URL;

export const EXPIRY_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
export const PAGINATION = 8;          // 8 entries per account record pagination
export const SKIP_PASSPHRASE = 10;
export const SHOW_USD = true;
export const UPDATE_DELAY = 3 * 1000; // 3 seconds
export const TOC_URL = "https://pingme.xyz/toc"
