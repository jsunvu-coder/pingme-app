/**
 * PendingSignupService
 *
 * Holds the in-memory credentials that were collected on the sign-up form
 * while the user is redirected to the email-verification screen.
 *
 * Lifecycle:
 *   1. CreateAccountView calls `set()` just before navigating to VerifyEmailScreen.
 *   2. VerifyEmailScreen reads via `get()` after the OTP is confirmed, then
 *      calls `auth.signup()` and immediately `clear()`s the pending data.
 *
 * Data is intentionally NOT persisted to AsyncStorage — if the app is killed
 * during verification the user simply restarts the sign-up form.
 */
export interface PendingSignupData {
  email: string;
  password: string;
  lockboxProof?: string;
  senderCommitment?: string;
  useBiometric: boolean;
  biometricType: string | null;
  /** Forwarded from CreateAccountView so VerifyEmailScreen can complete the full flow */
  claimedAmountUsd?: string;
  tokenName?: string;
  disableSuccessCallback?: boolean;
  disableSuccessScreen?: boolean;
  /**
   * Messaging identity fields generated at signup start (spec: Sign Up & Encrypted Notification Flow).
   * Held in RAM here; persisted to SecureStore only AFTER pm_verify_key succeeds.
   */
  seed: string;                // hexlify(32-byte CSPRNG seed) — root on-chain secret
  privateKeyMessaging: string; // hexlify(X25519 private key) — never sent to server
  encKeyRef: string;           // returned by /pm_register_key — used as body for /pm_verify_key
  /** ms-since-epoch when /pm_register_key succeeded. Per spec, OTP is valid for 10 minutes. */
  startedAt: number;
  /** Number of failed /pm_verify_key attempts. Per spec, >5 failures triggers flow restart. */
  attempts: number;
}

class PendingSignupService {
  private static _instance: PendingSignupService;
  private _data: PendingSignupData | null = null;

  private constructor() {}

  static getInstance(): PendingSignupService {
    if (!PendingSignupService._instance) {
      PendingSignupService._instance = new PendingSignupService();
    }
    return PendingSignupService._instance;
  }

  set(data: PendingSignupData): void {
    this._data = data;
  }

  get(): PendingSignupData | null {
    return this._data;
  }

  clear(): void {
    this._data = null;
  }

  has(): boolean {
    return this._data !== null;
  }
}

export const pendingSignupService = PendingSignupService.getInstance();
