// business/services/AuthService.ts
import { Alert } from 'react-native';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import {
  COMMITED_BY_ANOTHER_PARTY,
  CREDENTIALS_ALREADY_EXISTS,
  GLOBALS,
  GLOBAL_SALT,
  INVALID_CREDENTIALS,
  ZERO_BYTES32,
  SIGNIN_ERROR,
  SIGNUP_ERROR,
} from 'business/Constants';
import { EXPIRY_MS } from 'business/Config';
import { ContractService } from './ContractService';
import { BalanceService } from './BalanceService';
import { RecordService } from './RecordService';

export class AuthService {
  private static instance: AuthService;
  private contractService: ContractService;
  private balanceService: BalanceService;
  private recordService: RecordService;

  private constructor() {
    this.contractService = ContractService.getInstance();
    this.balanceService = BalanceService.getInstance();
    this.recordService = RecordService.getInstance();

    // Listen for session expiration
    this.contractService.onSessionExpired(async () => {
      console.warn('⚠️ Session expired — logging out.');
      await this.logout();
      Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
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
  private async _authenticate(username: string, password: string) {
    try {
      this.log('Authenticating user...');
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
      if (!ret2.has_balance) throw new Error(INVALID_CREDENTIALS);

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

      const rvProof = CryptoUtils.globalHash2(
        cr.input_data,
        Utils.getSessionObject(GLOBALS)[GLOBAL_SALT]
      );
      if (!rvProof) throw new Error('Failed to generate recovery proof.');
      const rvCommitment = CryptoUtils.globalHash(rvProof);
      if (!rvCommitment) throw new Error('Failed to generate recovery commitment.');
      const rvNewCommitmentInput = CryptoUtils.globalHash2(
        newInputData,
        Utils.getSessionObject(GLOBALS)[GLOBAL_SALT]
      );
      if (!rvNewCommitmentInput)
        throw new Error('Failed to generate recovery new commitment input.');
      const rvNewCommitment = CryptoUtils.globalHash(rvNewCommitmentInput);
      if (!rvNewCommitment) throw new Error('Failed to generate recovery new commitment.');

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

      const retPk = await this.contractService.rvGetRecoveryPk(rvCommitment);
      const recoveryPkHex = retPk?.recoveryPk;

      if (!recoveryPkHex || recoveryPkHex === ZERO_BYTES32) {
        this.log('No recovery vault found. Updating local state only.');
        cr.input_data = newInputData;
        cr.salt = newSalt;
        cr.current_salt = newSalt;
        cr.proof = newProof;
        cr.commitment = newCommitment;
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
      this.contractService.setCrypto(cr);

      this.log('Password change completed successfully.');
    } catch (err) {
      this.handleError('Password change failed', err);
    }
  }

  // ---------- Signin ----------
  async signin(username: string, password: string, lockboxProof?: string): Promise<boolean> {
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
      await this.commitProtect(
        () => this.contractService.claim(lockboxProof, cr.salt, cr.commitment),
        lockboxProofHash,
        saltHash,
        commitmentHash
      );

      this.log('Claim successful');
      return true;
    } catch (err) {
      this.handleError(SIGNIN_ERROR, err);
    }
  }

  // ---------- Signup ----------
  async signup(username: string, password: string, lockboxProof?: string): Promise<boolean> {
    try {
      this.log('Starting signup process...');
      const input_data = CryptoUtils.strToHex2(username, password);
      const salt = CryptoUtils.globalHash(input_data);
      if (!salt) throw new Error('Failed to generate salt.');
      const ret1 = await this.contractService.hasSalt(salt);
      if (ret1.has_salt) throw new Error(CREDENTIALS_ALREADY_EXISTS);

      const proof = CryptoUtils.globalHash2(input_data, salt);
      if (!proof) throw new Error('Failed to generate proof.');
      const commitment = CryptoUtils.globalHash(proof);
      this.contractService.setCrypto({
        username,
        input_data,
        salt,
        current_salt: salt,
        proof,
        commitment,
        expiry: Date.now() + EXPIRY_MS,
      });

      const newLockboxProof = lockboxProof || CryptoUtils.strToHex(username);
      if (newLockboxProof) {
        const lockboxProofHash = CryptoUtils.globalHash(newLockboxProof);
        if (!lockboxProofHash) throw new Error('Failed to generate lockbox proof hash.');
        if (!salt) throw new Error('Failed to generate salt.');
        const saltHash = CryptoUtils.globalHash(salt);
        if (!saltHash) throw new Error('Failed to generate salt hash.');
        if (!commitment) throw new Error('Failed to generate commitment.');
        const commitmentHash = CryptoUtils.globalHash(commitment);
        if (!commitmentHash) throw new Error('Failed to generate commitment hash.');
        await this.commitProtect(
          () => this.contractService.claim(newLockboxProof, salt, commitment),
          lockboxProofHash,
          saltHash,
          commitmentHash
        );
        this.log('Signup completed successfully (with claim)');
      } else {
        this.log('Signup completed successfully (no claim)');
      }
      return true;
    } catch (err) {
      this.handleError(SIGNUP_ERROR, err);
    }
  }

  // ---------- Logout ----------
  async logout(): Promise<void> {
    try {
      this.log('Logging out...');
      this.balanceService.clear();
      this.contractService.clearCrypto();
      this.log('Logout complete');
    } catch (err) {
      this.handleError('Logout failed', err);
    }
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
