import { getEnv } from './Config';

export const ACCOUNT = 'ACCOUNT';
export const ACTION = 'ACTION';
export const ARROW_DOWN = 'ArrowDown';
export const ARROW_UP = 'ArrowUp';
export const BALANCE_NOT_FOUND = 'BALANCE_NOT_FOUND';
export const CHANGE_PASSWORD = 'CHANGE_PASSWORD';
export const CLAIM = 'CLAIM';
export const CLAIMED = 'CLAIMED';
export const COMMITED_BY_ANOTHER_PARTY = 'COMMITED_BY_ANOTHER_PARTY';
export const CREDENTIALS_ALREADY_EXISTS = 'CREDENTIALS_ALREADY_EXISTS';
export const DEPOSIT = 'DEPOSIT';
export const ENTER = 'Enter';
export const ESCAPE = 'Escape';
export const GLOBAL_SALT = 'GLOBAL_SALT';
export const GLOBALS = 'GLOBALS';
export const HOME = 'HOME';
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
export const LOCKBOX = 'LOCKBOX';
export const MIN_AMOUNT = 'MIN_AMOUNT';
export const MIN_AMOUNT_WMON = 'MIN_AMOUNT_WMON';
export const MIN_PAYMENT_AMOUNT = 0.1;
export const MAX_PAYMENT_AMOUNT = 1_000_000;
export const MAX_BUNDLE_AMOUNT = 500;
export const NOT_HEX = 'NOT_HEX';
export const NOTIFICATION = 'NOTIFICATION';
export const OPEN = 'OPEN';
export const PAY = 'PAY';
export const RECLAIMED = 'RECLAIMED';
export const SESSION_EXPIRED = 'SESSION_EXPIRED';
export const SIGNIN = 'SIGNIN';
export const SIGNIN_CLAIM_ERROR = 'SIGNIN_CLAIM_ERROR';
export const SIGNIN_ERROR = 'SIGNIN_ERROR';
export const SIGNUP = 'SIGNUP';
export const SIGNUP_CLAIM_ERROR = 'SIGNUP_CLAIM_ERROR';
export const SIGNUP_ERROR = 'SIGNUP_ERROR';
export const SPACE = ' ';
export const TOPUP = 'TOPUP';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const LOCKBOX_DURATION = 14; // 14 day

// ####################################################
// DO NOT CHANGE THESE VALUES!!!!
// ####################################################
export const TOKENS = {
  USDC: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
  pUSDC: '0x32F62bDC2BE3E1B1C0265143831155253cd5A248',
  pWMON: '0xd4873a2127C2cCA4d8Ed156d7fd96a5d7D8C2f1c',
  WMON: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
};

export const TOKEN_NAMES = {
  USDC: 'USDC',
  pWMON: 'pWMON',
  WMON: 'WMON',
  pUSDC: 'pUSDC',
};

export const TOKEN_DECIMALS = {
  USDC: 6,
  pUSDC: 6,
  pWMON: 18,
  WMON: 18,
};

export const STABLE_TOKENS = ['USDC', 'pUSDC'];

export const TESTNET_TOKENS: (keyof typeof TOKENS)[] = ['pUSDC', 'pWMON'];

export const MAINNET_TOKENS: (keyof typeof TOKENS)[] = ['USDC', 'WMON'];

export const ENV: 'staging' | 'production' = getEnv();

export const ALL_TOKENS: (keyof typeof TOKENS)[] =
  ENV === 'production' ? MAINNET_TOKENS : TESTNET_TOKENS;

export const STABLE_TOKEN_ADDRESSES = STABLE_TOKENS.map(
  (token) => TOKENS[token as keyof typeof TOKENS]
);
export const ALL_TOKEN_ADDRESSES = ALL_TOKENS.map((token) => TOKENS[token as keyof typeof TOKENS]);
export const EMAIL_KEY = 'lastEmail';
export const PASSWORD_KEY = 'lastPassword';
export const USE_BIOMETRIC_KEY = 'useBiometric';

// ── Multi-account storage (spec: Sign Up & Encrypted Notification Flow) ──────────────────────────
//
// Each account's secrets are isolated under a per-email namespace in SecureStore.
// Non-sensitive list/pointer keys live in AsyncStorage (no need for Keychain protection).

/** AsyncStorage — JSON array of normalized email strings for all saved accounts. */
export const ACCOUNT_EMAILS_KEY = 'pingme:account_emails';

/** AsyncStorage — normalized email string of the currently active session. */
export const ACTIVE_ACCOUNT_EMAIL_KEY = 'pingme:active_account_email';

/** AsyncStorage — cached hex value of GLOBAL_SALT from /pm_get_globals. */
export const GLOBAL_SALT_CACHE_KEY = 'pingme:GLOBAL_SALT';

/**
 * Builds an email-namespaced SecureStore key.
 *
 * Used for NON-NULLABLE secrets that the spec requires to be gated by FaceID:
 * SEED (root on-chain secret), MESSAGING_PRIVATE_KEY (decrypt in-app messages).
 * ENC_KEY_REF is NOT stored here — per spec it is NON-SECURED UNENCRYPTED.
 *
 * expo-secure-store only allows: alphanumeric, ".", "-", "_"
 * So we use "." as the path separator and replace "@" with "_at_".
 *
 * Examples:
 *   accountSecureKey('User@Example.com', 'seed')
 *   → 'pingme.account.user_at_example.com.seed'
 */
export function accountSecureKey(
  email: string,
  field: 'seed' | 'messaging_private_key'
): string {
  const normalized = email.trim().toLowerCase().replace('@', '_at_');
  return `pingme.account.${normalized}.${field}`;
}

/**
 * Builds an email-namespaced AsyncStorage key for NON-SECURE account data.
 *
 * Per spec, ENC_KEY_REF is stored in NON-SECURED UNENCRYPTED memory (accessible
 * without FaceID), keyed by email.
 */
export function accountDataKey(email: string, field: 'enc_key_ref'): string {
  const normalized = email.trim().toLowerCase().replace('@', '_at_');
  return `pingme.account.${normalized}.${field}`;
}

/**
 * AsyncStorage key for the set of notification ids this device has marked as
 * handled (user tapped / acted on) per email.
 * Value is JSON array of numbers.
 */
export function notificationHandledKey(email: string): string {
  const normalized = email.trim().toLowerCase().replace('@', '_at_');
  return `pingme.account.${normalized}.notif_handled`;
}
