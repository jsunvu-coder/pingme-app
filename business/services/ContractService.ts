import axios from 'axios';
import { API_URL } from 'business/Config';
import { SESSION_EXPIRED, TOKEN_NAMES } from 'business/Constants';
import { showBlockingLogoutFlashMessage } from 'utils/flashMessage';
import { AuthService } from './AuthService';
import { setRootScreen } from 'navigation/Navigation';

/**
 * React Native version of Angular ContractService
 * - Uses async/await axios HTTP client
 * - Matches Angular 1:1 method parity
 * - BehaviorSubject replaced with internal memory + callbacks
 * - Includes detailed logging and session guard
 */

export class ContractService {
  private static instance: ContractService;
  private crypto: any | null = null;
  private sync: { blockTime: bigint; localTime: number } | null = null;
  private sessionExpiredCallbacks: (() => void)[] = [];
  private commitmentGuardPaused = false;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  // ========================================================
  // 🔐 SESSION MANAGEMENT
  // ========================================================
  onSessionExpired(callback: () => void) {
    this.sessionExpiredCallbacks.push(callback);
  }

  private triggerSessionExpired() {
    console.warn('⚠️ [ContractService] Session expired');
    for (const cb of this.sessionExpiredCallbacks) cb();
  }

  // ========================================================
  // 💾 CRYPTO STATE
  // ========================================================
  getCrypto() {
    return this.crypto;
  }

  setCrypto(crypto: any) {
    console.log('🔐 [ContractService] Crypto state set:', {
      username: crypto?.username,
      expiry: crypto?.expiry,
    });
    this.crypto = crypto;
  }

  clearCrypto() {
    console.log('🧹 [ContractService] Cleared crypto state');
    this.crypto = null;
  }

  pauseCommitmentGuard() {
    this.commitmentGuardPaused = true;
  }

  resumeCommitmentGuard() {
    this.commitmentGuardPaused = false;
  }

  isCommitmentGuardPaused() {
    return this.commitmentGuardPaused;
  }

  // ========================================================
  // 🕒 TIMESTAMP HANDLING
  // ========================================================
  async getTimestamp(): Promise<{ timestamp: bigint }> {
    const now = Date.now();
    if (this.sync) {
      const delta = Math.floor((now - this.sync.localTime) / 1000);
      return { timestamp: this.sync.blockTime + BigInt(delta) };
    }
    const ret = await this._getTimestamp();
    const blockTime = BigInt(ret.timestamp);
    this.sync = { blockTime, localTime: now };
    console.log('⏱ Cached timestamp:', blockTime.toString());
    return { timestamp: blockTime };
  }

  private async _getTimestamp() {
    return this.get('/pm_get_timestamp');
  }

  // ========================================================
  // ⚙️ LOW LEVEL HTTP HELPERS
  // ========================================================
  private async get(endpoint: string) {
    const url = `${API_URL}${endpoint}`;
    const start = Date.now();
    console.log(`📡 [GET] ${url}`);
    try {
      const { data, status } = await axios.get(url);
      console.log(`✅ [GET] ${url} (${status}) in ${Date.now() - start}ms`, data);
      return data;
    } catch (error: any) {
      this.logHttpError('GET', url, error, start);
      throw error;
    }
  }

  private async post(endpoint: string, body: Record<string, any>) {
    const url = `${API_URL}${endpoint}`;
    const start = Date.now();
    console.log(`📡 [POST] ${url}`, body);
    try {
      const { data, status } = await axios.post(url, body);
      console.log(`✅ [POST] ${url} (${status}) in ${Date.now() - start}ms`, data);
      return data;
    } catch (error: any) {
      this.logHttpError('POST', url, error, start);
      throw error;
    }
  }

  private logHttpError(method: string, url: string, error: any, start: number) {
    const duration = Date.now() - start;
    console.error(
      `❌ [${method}] ${url} failed after ${duration}ms`,
      '\nMessage:',
      error?.message,
      '\nStatus:',
      error?.response?.status ?? 'N/A',
      '\nResponse:',
      JSON.stringify(error?.response?.data ?? {}, null, 2)
    );
  }

  // ========================================================
  // 🛡️ SESSION GUARD
  // ========================================================
  private async sessionGuard<T>(call: () => Promise<T>): Promise<T> {
    const cr = this.getCrypto();
    if (cr?.expiry && Date.now() > cr.expiry) {
      this.triggerSessionExpired();
      throw new Error(SESSION_EXPIRED);
    }
    return await call();
  }

  /**
   * Check the current in-memory commitment with the backend and, if invalid,
   * show a blocking flash message that can only be dismissed via a Logout action.
   *
   * Returns:
   * - true  → commitment still valid (or no active session)
   * - false → commitment invalid, blocking flash message shown
   */
  async ensureCommitmentValidWithLogoutFlash(skipLogoutFlash: boolean = false): Promise<boolean> {
    if (skipLogoutFlash) {
      return true;
    }
    const cr = this.getCrypto();
    if (!cr?.commitment) {
      // No active crypto/session → treat as "nothing to validate".
      return true;
    }

    try {
      const result = await this.hasBalance(cr.commitment);
      const hasBalance = !!result?.has_balance;

      if (!hasBalance) {
        console.warn(
          '[ContractService] Commitment has no balance / invalid. Showing logout flash message.',
          { commitment: cr.commitment }
        );

        showBlockingLogoutFlashMessage({
          title: 'Session invalid',
          message: 'Your current session is no longer valid. Please log out to continue.',
          onLogout: () => {
            void (async () => {
              try {
                await AuthService.getInstance().logout();
              } finally {
                setRootScreen(['SplashScreen']);
              }
            })();
          },
        });

        return false;
      }

      return true;
    } catch (error) {
      console.warn('[ContractService] Failed to validate commitment state with backend', error);
      // On network / transient failures, do not forcibly logout.
      return true;
    }
  }

  // ========================================================
  // 🌍 OPEN CALLS (NO GUARD)
  // ========================================================
  async claim(proof: string, salt: string, commitment: string, senderCommitment?: string) {
    return this.post('/pm_claim', { proof, salt, commitment, sender_commitment: senderCommitment });
  }

  async commit(ct1: string, ct2?: string, ct3?: string) {
    return this.post('/pm_commit', { ct1, ct2, ct3 });
  }

  async getCurrentSalt(salt: string) {
    return this.get(`/pm_get_current_salt?salt=${salt}`);
  }

  async getGlobals() {
    return this.get('/pm_get_globals');
  }

  async getLockbox(lockbox_commitment: string) {
    return this.post('/pm_get_lockbox', { lockbox_commitment });
  }

  async hasBalance(commitment: string) {
    return this.get(`/pm_has_balance?commitment=${commitment}`);
  }

  async hasLockbox(commitment: string) {
    return this.get(`/pm_has_lockbox?commitment=${commitment}`);
  }

  async hasSalt(salt: string) {
    return this.get(`/pm_has_salt?salt=${salt}`);
  }

  // ========================================================
  // 🔐 GUARDED CALLS
  // ========================================================
  async changePassword(proof: string, next_salt: string, next_commitment: string) {
    return this.sessionGuard(() =>
      this.post('/pm_change_password', { proof, next_salt, next_commitment })
    );
  }

  async getBalance(commitment: string) {
    return this.sessionGuard(() => this.post('/pm_get_balance', { commitment }));
  }

  async getCommitState(ct1: string, ct2?: string, ct3?: string) {
    return this.sessionGuard(() => this.post('/pm_get_commit_state', { ct1, ct2, ct3 }));
  }

  async getEvents(commitment: string, batch_size?: number) {
    return this.sessionGuard(() => this.post('/pm_get_events', { commitment, batch_size }));
  }

  async getStats(commitment: string) {
    return this.sessionGuard(() => this.get(`/pm_get_stats?commitment=${commitment}`));
  }

  async getLeaders(commitment: string) {
    return this.sessionGuard(() => this.get(`/pm_get_leaders?commitment=${commitment}`));
  }

  async getForwarder(commitment: string) {
    return this.sessionGuard(() => this.get(`/pm_get_forwarder?commitment=${commitment}`));
  }

  async getForwarderBalance(forwarder: string) {
    return this.sessionGuard(() => this.post('/pm_get_forwarder_balance', { forwarder }));
  }

  async reclaim(lockbox_commitment: string) {
    return this.sessionGuard(() => this.post('/pm_reclaim', { lockbox_commitment }));
  }

  async requestPay(
    amount: string,
    requester: string,
    requestee: string,
    token: string,
    token_name: string,
    custom_message: string
  ) {
    return this.sessionGuard(() =>
      this.post('/pm_request_pay', {
        amount,
        requester,
        requestee,
        token,
        token_name,
        custom_message,
      })
    );
  }

  async retrieve(commitment: string) {
    return this.sessionGuard(() => this.post('/pm_retrieve', { commitment }));
  }

  async withdraw(
    token: string,
    amount: string,
    proof: string,
    next_commitment: string,
    recipient: string
  ) {
    return this.sessionGuard(() =>
      this.post('/pm_withdraw', {
        token,
        amount,
        proof,
        next_commitment,
        recipient,
      })
    );
  }

  async withdrawAndDeposit(
    token: string,
    amount: string,
    proof: string,
    next_commitment: string,
    commitment: string
  ) {
    return this.sessionGuard(() =>
      this.post('/pm_withdraw_and_deposit', {
        token,
        amount,
        proof,
        next_commitment,
        commitment,
      })
    );
  }

  async withdrawAndSend(
    token: string,
    amount: string,
    proof: string,
    next_commitment: string,
    duration: number,
    lockbox_commitment: string
  ) {
    return this.sessionGuard(() =>
      this.post('/pm_withdraw_and_send', {
        token,
        amount,
        proof,
        next_commitment,
        duration,
        lockbox_commitment,
      })
    );
  }

  async withdrawAndSendEmail(
    token: string,
    amount: string,
    proof: string,
    next_commitment: string,
    duration: number,
    lockbox_commitment: string,
    username: string,
    lockbox_salt: string,
    token_name: string,
    sender: string
  ) {
    return this.sessionGuard(() =>
      this.post('/pm_withdraw_and_send_email', {
        token,
        amount,
        proof,
        next_commitment,
        duration,
        lockbox_commitment,
        username,
        lockbox_salt,
        token_name: token_name ?? TOKEN_NAMES.USDC,
        sender,
      })
    );
  }

  // ========================================================
  // ✉️ EMAIL KEY / MESSAGING
  // ========================================================

  /**
   * Calls /pm_register_key — registers the user's email + X25519 public key.
   * Triggers a 6-digit OTP email. Returns `enc_key_ref` which must be kept
   * in memory (and later in SecureStore) until /pm_verify_key succeeds.
   *
   * Spec body: { email, pk }  where pk = hex-encoded X25519 public key.
   */
  async registerEmailKey(email: string, pk: string): Promise<{ enc_key_ref: string }> {
    return this.post('/pm_register_key', { email, pk });
  }

  /**
   * Calls /pm_verify_key — submits the OTP code received by email.
   * Must be called with the enc_key_ref returned by registerEmailKey.
   * On success: persist enc_key_ref + private messaging key + seed to SecureStore,
   * then call pm_faucet to bootstrap the on-chain account.
   *
   * Spec body: { enc_key_ref, v_code }
   */
  async verifyEmailKey(encKeyRef: string, vCode: string) {
    return this.post('/pm_verify_key', { enc_key_ref: encKeyRef, v_code: vCode });
  }

  /**
   * Calls /pm_faucet — bootstraps the user's on-chain account.
   * Must be called after /pm_verify_key succeeds, using salt and commitment
   * derived from the random seed (NOT from email:password).
   *
   * Spec body: { salt, commitment }
   */
  async faucet(salt: string, commitment: string) {
    return this.post('/pm_faucet', { salt, commitment });
  }

  /**
   * Calls /pm_get_enc_msgs — retrieves unexpired encrypted messages for the
   * given active key reference. Client decrypts locally with its private key.
   *
   * Spec body: { enc_key_ref }
   * Response: { messages: [{ id, enc_msg, expired_at, created_at }] }
   */
  async getEncMsgs(encKeyRef: string) {
    return this.post('/pm_get_enc_msgs', { enc_key_ref: encKeyRef });
  }

  // ========================================================
  // 🧩 RECOVERY FUNCTIONS
  // ========================================================
  async rvChangePassword(
    proof: string,
    commitment: string,
    ct_kem: string,
    ct: string,
    tag: string,
    nonce: string
  ) {
    return this.sessionGuard(() =>
      this.post('/rv_change_password', {
        proof,
        commitment,
        ct_kem,
        ct,
        tag,
        nonce,
      })
    );
  }

  async rvCommit(ct1: string, ct2: string) {
    return this.post('/rv_commit', { ct1, ct2 });
  }

  async rvGetCommitState(ct1: string, ct2: string) {
    return this.sessionGuard(() => this.post('/rv_get_commit_state', { ct1, ct2 }));
  }

  async rvGetRecoveryPk(
    commitment: string,
    noEnsureCommitmentValidWithLogoutFlash: boolean = false
  ) {
    // Ensure current commitment/session is still valid before calling recovery API.
    const ok = await this.ensureCommitmentValidWithLogoutFlash(
      noEnsureCommitmentValidWithLogoutFlash
    );
    if (!ok && !noEnsureCommitmentValidWithLogoutFlash) {
      return Promise.resolve(null as any);
    }

    return this.sessionGuard(() => this.post('/rv_get_recovery_pk', { commitment }));
  }

  async rvGetVaultRecordByRecoveryPk(recovery_pk: string) {
    return this.sessionGuard(() =>
      this.post('/rv_get_vault_record_by_recovery_pk', { recovery_pk })
    );
  }

  async rvInitialize(
    commitment: string,
    recovery_pk: string,
    ct_kem: string,
    ct: string,
    tag: string,
    nonce: string
  ) {
    return this.sessionGuard(() =>
      this.post('/rv_initialize', {
        commitment,
        recovery_pk,
        ct_kem,
        ct,
        tag,
        nonce,
      })
    );
  }
}
