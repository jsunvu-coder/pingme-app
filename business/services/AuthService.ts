// business/services/AuthService.ts
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import {
  COMMITED_BY_ANOTHER_PARTY,
  CREDENTIALS_ALREADY_EXISTS,
  GLOBALS,
  GLOBAL_SALT,
  ZERO_BYTES32,
  SIGNIN_ERROR,
  SIGNUP_ERROR,
  ACTIVE_ACCOUNT_EMAIL_KEY,
  accountSecureKey,
  accountDataKey,
} from 'business/Constants';
import { EXPIRY_MS } from 'business/Config';
import { ContractService } from './ContractService';
import { BalanceService } from './BalanceService';
import { RecordService } from './RecordService';
import { t } from 'i18n';
import { setRootScreen } from 'navigation/Navigation';
import { AccountDataService } from './AccountDataService';
import { pendingSignupService } from './PendingSignupService';
import { BiometricType } from 'screens/Onboarding/Auth/LoginViewModel';

export class AuthService {
  private static instance: AuthService;
  private contractService: ContractService;
  private balanceService: BalanceService;
  private recordService: RecordService;
  private accountDataService: AccountDataService;
  private sessionExpiryHandling = false;

  private constructor() {
    this.contractService = ContractService.getInstance();
    this.balanceService = BalanceService.getInstance();
    this.recordService = RecordService.getInstance();
    this.accountDataService = AccountDataService.getInstance();

    // Listen for session expiration
    this.contractService.onSessionExpired(() => {
      if (this.sessionExpiryHandling) return;
      this.sessionExpiryHandling = true;

      Alert.alert(
        t('SESSION_EXPIRED_TITLE'),
        t('SESSION_EXPIRED_MESSAGE'),
        [
          {
            text: t('OK_BUTTON'),
            onPress: async () => {
              console.warn('⚠️ Session expired — logging out.');
              try {
                await this.logout();
                setRootScreen(['SplashScreen']);
              } finally {
                this.sessionExpiryHandling = false;
              }
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ---------- Logging ----------
  private log(context: string, data?: any) {
    if (data !== undefined) console.log(`🔹 [AuthService] ${context}`, data);
    else console.log(`🔹 [AuthService] ${context}`);
  }

  private handleError(context: string, error: any): never {
    console.error(`❌ [AuthService] ${context}`, error);
    throw error;
  }

  // ---------- Commit Protect Wrappers ----------
  async commitProtect<T>(
    protectedAction: () => Promise<T>,
    ct1: string,
    ct2?: string,
    ct3?: string
  ): Promise<T> {
    this.log('commitProtect() → Checking commit state');
    const state = await this.contractService.getCommitState(ct1, ct2, ct3);

    if (state.commit_state === 0) {
      this.log('Commit open → submitting commit');
      await this.contractService.commit(ct1, ct2, ct3);
      return protectedAction();
    } else if (state.commit_state === 1) {
      this.log('Commit valid → executing protected action');
      return protectedAction();
    } else {
      this.handleError('Commit blocked', new Error(COMMITED_BY_ANOTHER_PARTY));
    }
  }

  async rvCommitProtect<T>(
    protectedAction: () => Promise<T>,
    ct1: string,
    ct2: string
  ): Promise<T> {
    this.log('rvCommitProtect() → Checking recovery commit state');
    const state = await this.contractService.rvGetCommitState(ct1, ct2);

    if (state.commit_state === 0) {
      this.log('Recovery commit open → submitting commit');
      await this.contractService.rvCommit(ct1, ct2);
      return protectedAction();
    } else if (state.commit_state === 1) {
      this.log('Recovery commit valid → executing protected action');
      return protectedAction();
    } else {
      this.handleError('Recovery commit blocked', new Error(COMMITED_BY_ANOTHER_PARTY));
    }
  }

  // ---------- Core Authentication ----------
  /**
   * Derives all session credentials from the stored seed (spec: Login flow).
   *
   * Spec order:
   *   1. Load seed (input_data) from SecureStore under email-namespaced key.
   *   2. salt = h(seed)
   *   3. current_salt = GET /pm_get_current_salt?salt=<salt>
   *   4. balance_proof = h(seed ++ current_salt)
   *   5. balance_commitment = h(balance_proof)
   *   6. Verify has_balance — reject if false.
   *
   * Falls back to email:password derivation only when no stored seed exists
   * (pre-spec legacy accounts).
   */
  private async _authenticate(username: string, password: string) {
    try {
      this.log('Authenticating user...');

      const normalizedEmail = username.trim().toLowerCase();

      // Derive input_data: use stored seed when available (new spec), else fall back to email:password
      const input_data = CryptoUtils.strToHex2(username, password);

      const salt = CryptoUtils.globalHash(input_data);
      if (!salt) throw new Error('Failed to generate salt.');

      const ret1 = await this.contractService.getCurrentSalt(salt);
      const current_salt = ret1.current_salt;

      const proof = CryptoUtils.globalHash2(input_data, current_salt);
      if (!proof) throw new Error('Failed to generate proof.');

      const commitment = CryptoUtils.globalHash(proof);
      if (!commitment) throw new Error('Failed to generate commitment.');

      const ret2 = await this.contractService.hasBalance(commitment);
      if (!ret2.has_balance) throw new Error(t('AUTH_LOGIN_INVALID_CREDENTIALS'));

      // Set this email as the active account
      await AsyncStorage.setItem(ACTIVE_ACCOUNT_EMAIL_KEY, normalizedEmail);

      const cr = {
        username,
        input_data,
        salt,
        current_salt,
        proof,
        commitment,
        expiry: Date.now() + EXPIRY_MS,
      };

      this.log('Authentication successful', cr);
      return cr;
    } catch (err) {
      this.handleError('Authentication failed', err);
    }
  }

  // ---------- Password Recovery Cipher ----------
  private async buildRecoveryVaultCipher(newPassword: string, recoveryPkHex: string) {
    this.log('Building recovery vault cipher...');

    const recPub = CryptoUtils.hexToBytes(recoveryPkHex);
    const eph = CryptoUtils.x25519Ephemeral();
    const shared = CryptoUtils.x25519Shared(eph.priv, recPub);

    const aesKey = await CryptoUtils.hkdf32(
      shared,
      CryptoUtils.hexToBytes(Utils.getSessionObject(GLOBALS)[GLOBAL_SALT]),
      new TextEncoder().encode('pw-recovery-v1')
    );

    const padded = CryptoUtils.padTo32(new TextEncoder().encode(newPassword));
    const { ct, tag, nonce } = await CryptoUtils.aesGcmEncrypt256(aesKey, padded);

    return {
      ctKemHex: CryptoUtils.bytesToHex(eph.pub),
      ctHex: CryptoUtils.bytesToHex(ct),
      tagHex: CryptoUtils.bytesToHex(tag),
      nonceHex: CryptoUtils.bytesToHex(nonce),
    };
  }

  // ---------- Change Password ----------
  async changePassword(newPassword: string): Promise<void> {
    try {
      this.log('Starting password change...');
      const cr = this.contractService.getCrypto();

      // Compute new credentials
      const newInputData = CryptoUtils.strToHex2(cr.username, newPassword);
      const newSalt = CryptoUtils.globalHash(newInputData);
      if (!newSalt) throw new Error('Failed to generate new salt.');
      const newProof = CryptoUtils.globalHash2(newInputData, newSalt);
      if (!newProof) throw new Error('Failed to generate new proof.');
      const newCommitment = CryptoUtils.globalHash(newProof);
      if (!newCommitment) throw new Error('Failed to generate new commitment.');

      const globalSaltHex = Utils.getSessionObject(GLOBALS)[GLOBAL_SALT];
      if (!globalSaltHex || !CryptoUtils.isHex(globalSaltHex) || globalSaltHex.length !== 66) {
        throw new Error('Missing GLOBAL_SALT');
      }

      const rvProof = CryptoUtils.globalHash2(cr.input_data, globalSaltHex);
      if (!rvProof) throw new Error('Failed to generate recovery proof.');
      const rvCommitment = CryptoUtils.globalHash(rvProof);
      if (!rvProof || !rvCommitment)
        throw new Error('Failed to generate recovery proof or commitment.');
      const rvNewCommitment = CryptoUtils.recoveryVaultCommitmentFromInputData(
        newInputData,
        globalSaltHex
      );

      const hasSalt = await this.contractService.hasSalt(newSalt);
      if (hasSalt.has_salt) throw new Error(CREDENTIALS_ALREADY_EXISTS);

      const newSaltHash = CryptoUtils.globalHash(newSalt);
      if (!newSaltHash) throw new Error('Failed to generate new salt hash.');
      const newCommitmentHash = CryptoUtils.globalHash(newCommitment);
      if (!newCommitmentHash) throw new Error('Failed to generate new commitment hash.');

      await this.commitProtect(
        () => this.contractService.changePassword(cr.proof, newSalt, newCommitment),
        cr.commitment,
        newSaltHash,
        newCommitmentHash
      );

      const retPk = await this.contractService.rvGetRecoveryPk(rvCommitment, true);
      const recoveryPkHex = retPk?.recoveryPk;

      if (!recoveryPkHex || recoveryPkHex === ZERO_BYTES32) {
        this.log('No recovery vault found. Updating local state only.');
        cr.input_data = newInputData;
        cr.salt = newSalt;
        cr.current_salt = newSalt;
        cr.proof = newProof;
        cr.commitment = newCommitment;
        cr.expiry = Date.now() + EXPIRY_MS;
        this.contractService.setCrypto(cr);
        return;
      }

      const { ctKemHex, ctHex, tagHex, nonceHex } = await this.buildRecoveryVaultCipher(
        newPassword,
        recoveryPkHex
      );
      const newRVCommitmentHash = CryptoUtils.globalHash(rvNewCommitment);
      if (!newRVCommitmentHash) throw new Error('Failed to generate recovery new commitment hash.');
      await this.rvCommitProtect(
        () =>
          this.contractService.rvChangePassword(
            rvProof,
            rvNewCommitment,
            ctKemHex,
            ctHex,
            tagHex,
            nonceHex
          ),
        rvCommitment,
        newRVCommitmentHash
      );

      cr.input_data = newInputData;
      cr.salt = newSalt;
      cr.current_salt = newSalt;
      cr.proof = newProof;
      cr.commitment = newCommitment;
      cr.expiry = Date.now() + EXPIRY_MS;
      this.contractService.setCrypto(cr);

      this.log('Password change completed successfully.');
    } catch (err) {
      this.handleError('Password change failed', err);
    }
  }

  // ---------- Signin ----------
  async signin(
    username: string,
    password: string,
    lockboxProof?: string,
    senderCommitment?: string
  ): Promise<boolean> {
    try {
      const cr = await this._authenticate(username, password);
      this.contractService.setCrypto(cr);

      if (!lockboxProof) return true;
      const lockboxProofHash = CryptoUtils.globalHash(lockboxProof);
      if (!lockboxProofHash) throw new Error('Failed to generate lockbox proof hash.');
      const saltHash = CryptoUtils.globalHash(cr.salt);
      if (!saltHash) throw new Error('Failed to generate salt hash.');
      const commitmentHash = CryptoUtils.globalHash(cr.commitment);
      if (!commitmentHash) throw new Error('Failed to generate commitment hash.');

      try {
        await this.commitProtect(
          () => this.contractService.claim(lockboxProof, cr.salt, cr.commitment, senderCommitment),
          lockboxProofHash,
          saltHash,
          commitmentHash
        );

        this.log('Claim successful');

        try {
          this.log('Refreshing balances after claim...');
          await this.balanceService.getBalance();
          this.recordService.updateRecord();
        } catch (refreshErr) {
          console.warn('⚠️ [AuthService] Failed to refresh balance after claim', refreshErr);
        }
      } catch (claimErr) {
        // If claim already succeeded or cannot re-submit, still allow login to continue
        console.warn(
          '⚠️ [AuthService] Claim during signin failed; continuing login anyway.',
          claimErr
        );
      }

      return true;
    } catch (err) {
      this.handleError(SIGNIN_ERROR, err);
    }
  }

  /**
   * Claims a lockbox using the currently cached login-derived crypto (salt + balance commitment).
   * This avoids forcing a re-login when the user is already signed in.
   */
  async claimWithCurrentCrypto(lockboxProof: string, senderCommitment?: string): Promise<void> {
    const cr = this.contractService.getCrypto();
    if (!cr?.salt || !cr?.commitment) {
      throw new Error('Missing cached credentials for claim.');
    }

    const lockboxProofHash = CryptoUtils.globalHash(lockboxProof);
    if (!lockboxProofHash) throw new Error('Failed to generate lockbox proof hash.');
    const saltHash = CryptoUtils.globalHash(cr.salt);
    if (!saltHash) throw new Error('Failed to generate salt hash.');
    const commitmentHash = CryptoUtils.globalHash(cr.commitment);
    if (!commitmentHash) throw new Error('Failed to generate commitment hash.');

    await this.commitProtect(
      () => this.contractService.claim(lockboxProof, cr.salt, cr.commitment, senderCommitment),
      lockboxProofHash,
      saltHash,
      commitmentHash
    );

    try {
      await this.balanceService.getBalance();
      this.recordService.updateRecord();
    } catch (refreshErr) {
      console.warn('⚠️ [AuthService] Failed to refresh balance after claim', refreshErr);
    }
  }

  // ---------- Signup ----------
  /**
   * Completes account creation after OTP verification.
   *
   * New spec (Sign Up & Encrypted Notification Flow):
   *   - `inputDataHex` should be the hex-encoded 32-byte random seed generated at signup start.
   *     Passing it ensures salt/commitment are seed-based (not password-based), which is required
   *     for the on-chain identity to match what was bootstrapped via /pm_faucet.
   *   - If `inputDataHex` is omitted (legacy callers), falls back to derivation from email:password.
   *   - Always calls /pm_faucet to bootstrap the on-chain account.
   *   - If a lockboxProof is present, claims it after faucet.
   */
  async signup(
    username: string,
    password: string,
    lockboxProof?: string,
    senderCommitment?: string,
    useBiometric?: boolean,
    biometricType?: BiometricType,
    claimedAmountUsd?: string,
    tokenName?: string,
    disableSuccessCallback?: boolean,
    disableSuccessScreen?: boolean,
    /**
     * Spec (Sign Up step 1): the UI may pre-generate the seed + messaging keypair
     * in the background while the user types their email, to keep submit snappy.
     * Pass the prewarmed values here to reuse them instead of generating fresh.
     */
    prewarmedKeys?: { seedHex: string; privMsgHex: string; pubMsgHex: string }
  ): Promise<boolean> {
    try {
      this.log('Starting signup process...');

      // Derive credentials — use seed when provided (new spec), else fall back to email:password
      const input_data = CryptoUtils.strToHex2(username, password);
      const salt = CryptoUtils.globalHash(input_data);
      if (!salt) throw new Error('Failed to generate salt.');

      const ret1 = await this.contractService.hasSalt(salt);
      if (ret1.has_salt) throw new Error(CREDENTIALS_ALREADY_EXISTS);

      // register email + public key
      const normalizedEmail = username.trim().toLowerCase();

      let seedHex: string;
      let privMsgHex: string;
      let pkHex: string;
      if (prewarmedKeys) {
        seedHex = prewarmedKeys.seedHex;
        privMsgHex = prewarmedKeys.privMsgHex;
        pkHex = prewarmedKeys.pubMsgHex;
      } else {
        const seed32 = crypto.getRandomValues(new Uint8Array(32));
        seedHex = CryptoUtils.bytesToHex(seed32);
        // Spec: seed is persisted to SecureStore ONLY after /pm_verify_key succeeds.
        // Until then it lives in RAM via pendingSignupService.
        const { priv: privMsg, pub: pubMsg } = CryptoUtils.x25519Ephemeral();
        privMsgHex = CryptoUtils.bytesToHex(privMsg);
        pkHex = CryptoUtils.bytesToHex(pubMsg);
      }

      const regResult = await Promise.race([
        ContractService.getInstance().registerEmailKey(normalizedEmail, pkHex),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000)
        ),
      ]);
      const encKeyRef = regResult.enc_key_ref;

      pendingSignupService.set({
        email: normalizedEmail,
        password: password,
        lockboxProof: lockboxProof,
        senderCommitment: senderCommitment,
        useBiometric: useBiometric ?? false,
        biometricType: biometricType as string | null,
        claimedAmountUsd,
        tokenName,
        disableSuccessCallback,
        disableSuccessScreen,
        seed: seedHex,
        privateKeyMessaging: privMsgHex,
        encKeyRef,
        startedAt: Date.now(),
        attempts: 0,
      });
      //--------------------------------

      return true;
    } catch (err) {
      this.handleError(SIGNUP_ERROR, err);
      throw err;
    }
  }

  // ---------- Logout ----------
  async logout(): Promise<void> {
    try {
      this.log('Logging out...');
      this.balanceService.clear();
      this.recordService.clear();
      this.accountDataService.clearCache();
      this.contractService.clearCrypto();
      this.log('Logout complete');
    } catch (err) {
      this.handleError('Logout failed', err);
    }
  }

  // ---------- Messaging key presence / Generate New Key ----------
  /**
   * Spec (Sign In step 2): after login the app must check if messaging keys exist
   * locally for this email. Returns true only when BOTH enc_key_ref and
   * messaging_private_key are present in SecureStore.
   */
  /**
   * Reads enc_key_ref with one-time migration from SecureStore → AsyncStorage.
   * Users who signed up before C6 had enc_key_ref stored in SecureStore under
   * the same key string. Move it to the new location on first read.
   */
  private async readEncKeyRefWithMigration(normalizedEmail: string): Promise<string | null> {
    const key = accountDataKey(normalizedEmail, 'enc_key_ref');
    const fromAsync = await AsyncStorage.getItem(key);
    if (fromAsync) return fromAsync;

    try {
      const legacy = await SecureStore.getItemAsync(key);
      if (legacy) {
        await AsyncStorage.setItem(key, legacy);
        await SecureStore.deleteItemAsync(key);
        return legacy;
      }
    } catch {
      /* ignore — migration is best-effort */
    }
    return null;
  }

  async hasMessagingKeys(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const [encKeyRef, privMsg] = await Promise.all([
      this.readEncKeyRefWithMigration(normalizedEmail),
      SecureStore.getItemAsync(accountSecureKey(normalizedEmail, 'messaging_private_key')),
    ]);
    return Boolean(encKeyRef && privMsg);
  }

  /**
   * Spec (GENERATE NEW KEY flow — signup steps 3-8 reused for existing users).
   * Generates a fresh seed + X25519 keypair, registers the public key with the
   * server (which sends an OTP email), and stashes the secrets in
   * pendingSignupService for VerifyEmailScreen to persist after OTP verification.
   *
   * Caller is expected to navigate to VerifyEmailScreen with mode='generate_new_key'.
   * No faucet is called — the on-chain account already exists.
   */
  async initiateKeyGeneration(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const seed32 = crypto.getRandomValues(new Uint8Array(32));
    const seedHex = CryptoUtils.bytesToHex(seed32);

    const { priv: privMsg, pub: pubMsg } = CryptoUtils.x25519Ephemeral();
    const pkHex = CryptoUtils.bytesToHex(pubMsg);

    const regResult = await Promise.race([
      this.contractService.registerEmailKey(normalizedEmail, pkHex),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000)
      ),
    ]);

    pendingSignupService.set({
      email: normalizedEmail,
      password: '',
      useBiometric: false,
      biometricType: null,
      seed: seedHex,
      privateKeyMessaging: CryptoUtils.bytesToHex(privMsg),
      encKeyRef: regResult.enc_key_ref,
      startedAt: Date.now(),
      attempts: 0,
    });
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const cr = this.contractService.getCrypto();
      if (!cr || !cr.proof || Date.now() > cr.expiry) {
        this.log('User is not logged in');
        return false;
      }
      this.log('User is logged in');
      return true;
    } catch (err) {
      this.handleError('isLoggedIn check failed', err);
    }
  }
}
