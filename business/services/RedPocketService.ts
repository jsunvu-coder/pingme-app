/**
 * Red Pocket Service
 *
 * Service for managing Red Pocket functionality including:
 * - Creating red pocket bundles
 * - Claiming red pockets
 * - Getting bundle status
 * - Reclaiming expired pockets
 *
 * Reuses utilities from @/utils/claim for crypto operations, validation, and API calls.
 */

import { ContractService } from './ContractService';
import { AuthService } from './AuthService';
import { BalanceService } from './BalanceService';
import { CryptoUtils } from '../CryptoUtils';
import {
  computeLockboxProof,
  computeCommitHashes,
  getCurrentUserCrypto,
  isValidHex,
  validateHexString,
  refreshAfterClaim,
  type CommitData,
  type ClaimCryptoData,
} from '../../utils/claim';
import { RED_POCKET_API_URL } from 'business/Config';
import { COMMITED_BY_ANOTHER_PARTY, SESSION_EXPIRED } from 'business/Constants';
import { ApiClient } from '../../api/ApiClient';
import { logger } from '../../utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RedPocketTimestamp {
  timestamp: string; // Unix timestamp in seconds
}

export interface CommitRequest {
  ct1: string; // Required: bytes32 hex string
  ct2?: string; // Optional: bytes32 hex string
  ct3?: string; // Optional: bytes32 hex string
}

export interface CommitResponse {
  status: number; // 1 = success, 0 = failure
  txHash: string;
}

export interface CommitStateRequest {
  ct1: string;
  ct2?: string;
  ct3?: string;
}

export interface CommitStateResponse {
  commit_state: number; // 0=not committed, 1=committed waiting, 2=committed ready
}

export interface CreateBundleRequest {
  token: string; // Token contract address
  total_amount: bigint; // Total amount in micro-units
  quantity: number; // Number of pockets (1-N)
  duration: number; // Expiration duration in seconds
  message?: string; // Optional message
}

export interface CreateBundleResponse {
  uuid: string; // Bundle UUID
  txHash: string;
  status: number; // 1 = success
}

export interface CreateBundleError {
  error: string;
  txHash?: string;
}

export interface ClaimBundleRequest {
  bundle_uuid: string;
  salt: string; // User's salt (32 bytes)
  commitment: string; // User's balance commitment (32 bytes)
  username: string; // Username (will be lowercased)
}

export interface ClaimBundleResponse {
  status: number; // 1=success, 0=all claimed, -1=already claimed, -2=reclaimed, -3=expired
  txHash?: string;
  amount?: string;
  token?: string;
  message?: string;
}

export interface BundleStatusRequest {
  bundle_uuid: string;
}

export interface ClaimedPocket {
  amount: string;
  username: string;
}

export interface BundleStatusResponse {
  token: string;
  quantity: number;
  unlock_time: number;
  state: string; // 'A' = Active
  claimed: ClaimedPocket[];
}

export interface ReclaimRequest {
  commitment: string; // User's balance commitment (32 bytes)
  lockbox_salt: string; // Lockbox salt (32 bytes)
}

export interface ReclaimResponse {
  status: number; // 1=success, -1=already claimed, -2=already reclaimed, -3=not expired
  reclaimTx?: string;
  depositTx?: string;
  token?: string;
  amount?: string;
  message?: string;
}

// ============================================================================
// Red Pocket Service
// ============================================================================

export class RedPocketService {
  private static instance: RedPocketService;

  private contractService: ContractService;
  private authService: AuthService;
  private balanceService: BalanceService;
  private apiClient: ApiClient;
  private scopedLogger = logger.createScoped('RedPocketService');

  private baseUrl: string = RED_POCKET_API_URL || 'https://redpocket.staging.pingme.xyz/';

  private constructor() {
    this.contractService = ContractService.getInstance();
    this.authService = AuthService.getInstance();
    this.balanceService = BalanceService.getInstance();

    // Initialize API client with base URL
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiClient = ApiClient.getInstance(cleanBaseUrl);
  }

  static getInstance(): RedPocketService {
    if (!RedPocketService.instance) {
      RedPocketService.instance = new RedPocketService();
    }
    return RedPocketService.instance;
  }

  /**
   * Set the base URL for Red Pocket API
   * @param url - Base URL (production or staging)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    this.apiClient.setBaseURL(this.baseUrl);
    this.scopedLogger.info('Base URL updated', { baseUrl: this.baseUrl });
  }

  // ========================================================
  // 🛡️ SESSION GUARD
  // ========================================================
  private async sessionGuard<T>(call: () => Promise<T>): Promise<T> {
    const cr = this.contractService.getCrypto();
    if (cr?.expiry && Date.now() > cr.expiry) {
      this.scopedLogger.error('Session expired');
      throw new Error(SESSION_EXPIRED);
    }
    return await call();
  }

  // ============================================================================
  // Timestamp API
  // ============================================================================

  /**
   * Get current blockchain timestamp
   * Useful for calculating expiration times before creating bundles
   *
   * @returns Current timestamp
   *
   * @example
   * ```ts
   * const { timestamp } = await redPocketService.getTimestamp();
   * const unlockTime = parseInt(timestamp) + duration;
   * ```
   */
  async getTimestamp(): Promise<RedPocketTimestamp> {
    this.scopedLogger.info('Getting timestamp');

    try {
      const data = await this.apiClient.get<RedPocketTimestamp>('/pm_get_timestamp');
      this.scopedLogger.info('Timestamp retrieved', { timestamp: data.timestamp });
      return data;
    } catch (error) {
      this.scopedLogger.error('Failed to get timestamp', error);
      throw error;
    }
  }

  // ============================================================================
  // Commit-Reveal API
  // ============================================================================

  /**
   * Create on-chain commitments required for cryptographic operations
   *
   * @param request - Commit request with ct1, ct2, ct3 hashes
   * @returns Commit response with status and txHash
   *
   * @example
   * ```ts
   * const result = await redPocketService.commit({
   *   ct1: '0x123...',
   *   ct2: '0x456...',
   *   ct3: '0x789...'
   * });
   * ```
   */
  async commit(request: CommitRequest): Promise<CommitResponse> {
    this.scopedLogger.info('Submitting commit');

    // Validate hex strings
    if (!isValidHex(request.ct1)) {
      throw new Error('Invalid ct1: must be 32 bytes hex string');
    }
    if (request.ct2 && !isValidHex(request.ct2)) {
      throw new Error('Invalid ct2: must be 32 bytes hex string');
    }
    if (request.ct3 && !isValidHex(request.ct3)) {
      throw new Error('Invalid ct3: must be 32 bytes hex string');
    }

    try {
      const data = await this.apiClient.post<CommitResponse>('/pm_commit', request);
      this.scopedLogger.info('Commit submitted', { txHash: data.txHash });
      return data;
    } catch (error) {
      this.scopedLogger.error('Failed to submit commit', error);
      throw error;
    }
  }

  /**
   * Check the state of previously created commitments
   *
   * @param request - Commit state request
   * @returns Commit state (0=not committed, 1=waiting, 2=ready)
   *
   * @example
   * ```ts
   * const { commit_state } = await redPocketService.getCommitState({
   *   ct1: '0x123...',
   *   ct2: '0x456...',
   *   ct3: '0x789...'
   * });
   * if (commit_state === 2) {
   *   // Ready to proceed
   * }
   * ```
   */
  async getCommitState(request: CommitStateRequest): Promise<CommitStateResponse> {
    this.scopedLogger.info('Getting commit state');

    return this.sessionGuard(async () => {
      try {
        const data = await this.apiClient.post<CommitStateResponse>(
          '/pm_get_commit_state',
          request
        );
        this.scopedLogger.info('Commit state retrieved', { commit_state: data.commit_state });
        return data;
      } catch (error) {
        this.scopedLogger.error('Failed to get commit state', error);
        throw error;
      }
    });
  }

  /**
   * bundleCommitProtect — commit-reveal wrapper required before createBundle.
   *
   * Ensures ct1 (current commitment) and ct2 (H(next_commitment)) are committed on-chain
   * before running the protected action (createBundle). See RED_POCKET_API.md.
   *
   * - state 0: commit(ct1, ct2) then run action
   * - state 1: skip commit, run action
   * - state 2: throw COMMITED_BY_ANOTHER_PARTY
   */
  async bundleCommitProtect<T>(
    protectedAction: () => Promise<T>,
    ct1: string,
    ct2: string
  ): Promise<T> {
    this.scopedLogger.info('bundleCommitProtect → checking commit state');
    const state = await this.getCommitState({ ct1, ct2 });

    if (state.commit_state === 0) {
      this.scopedLogger.info('Commit open → submitting commit (ct1, ct2)');
      await this.commit({ ct1, ct2 });
      return protectedAction();
    }
    if (state.commit_state === 1) {
      this.scopedLogger.info('Commit valid → executing protected action');
      return protectedAction();
    }
    this.scopedLogger.error('Commit blocked', { commit_state: state.commit_state });
    throw new Error(COMMITED_BY_ANOTHER_PARTY);
  }

  // ============================================================================
  // Bundle Creation API
  // ============================================================================

  /**
   * Create a Red Pocket bundle
   *
   * Automatically generates proof and next_commitment from current user's crypto state.
   * Uses bundleCommitProtect to ensure commit-reveal pattern is followed.
   *
   * @param request - Bundle creation request (token, total_amount, quantity, duration, message required)
   * @returns Bundle UUID and transaction hash
   *
   * @example
   * ```ts
   * const result = await redPocketService.createBundle({
   *   token: '0x...',
   *   total_amount: BigInt('100000000'), // 100 USDT in micro-units
   *   quantity: 5,
   *   duration: 120,
   *   message: 'Happy New Year!'
   * });
   * console.log('Bundle created:', result.uuid);
   * ```
   */
  async createBundle(request: CreateBundleRequest): Promise<CreateBundleResponse> {
    this.scopedLogger.info('Creating bundle');
    // Always auto-generate client_request_id for idempotency
    const client_request_id = this.generateClientRequestId();
    if (!isValidHex(request.token, 42)) {
      throw new Error('Invalid token address');
    }
    if (request.quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Always auto-generate proof and next_commitment from current user's crypto state
    this.scopedLogger.info('Generating proof and next_commitment from current user');

    // Get current user's crypto data
    const crypto = this.contractService.getCrypto();
    if (!crypto?.current_salt || !crypto?.input_data || !crypto?.commitment || !crypto?.proof) {
      throw new Error('User not logged in or missing crypto credentials');
    }

    // Generate next_current_salt -> next_proof -> next_commitment
    const nextCurrentSalt = CryptoUtils.globalHash(crypto.current_salt);
    if (!nextCurrentSalt) {
      throw new Error('Failed to generate next current salt');
    }

    const nextProof = CryptoUtils.globalHash2(crypto.input_data, nextCurrentSalt);
    if (!nextProof) {
      throw new Error('Failed to generate next proof');
    }

    const nextCommitment = CryptoUtils.globalHash(nextProof);
    if (!nextCommitment) {
      throw new Error('Failed to generate next commitment');
    }

    // Use current proof and generated next commitment
    const proof = crypto.proof;
    const next_commitment = nextCommitment;

    // For bundleCommitProtect: ct1 = current commitment, ct2 = H(next_commitment)
    const ct1 = crypto.commitment;
    const ct2 = CryptoUtils.globalHash(nextCommitment);
    if (!ct2) {
      throw new Error('Failed to generate H(next_commitment) for bundleCommitProtect');
    }

    this.scopedLogger.info('Generated proof and next_commitment');

    const payload = {
      client_request_id,
      token: request.token,
      total_amount: request.total_amount.toString(),
      quantity: request.quantity,
      duration: request.duration,
      proof,
      next_commitment,
      message: request.message,
    };

    try {
      // Always use bundleCommitProtect to ensure commit-reveal pattern
      const data = await this.bundleCommitProtect(
        () =>
          this.sessionGuard(() =>
            this.apiClient.post<CreateBundleResponse>('/pm_create_bundle', payload)
          ),
        ct1,
        ct2
      );

      this.scopedLogger.info('Bundle created', { uuid: data.uuid, txHash: data.txHash });

      // Always update crypto state after successful bundle creation
      const updatedCrypto = this.contractService.getCrypto();
      if (updatedCrypto) {
        updatedCrypto.current_salt = nextCurrentSalt;
        updatedCrypto.proof = nextProof;
        updatedCrypto.commitment = next_commitment;
        this.contractService.setCrypto(updatedCrypto);

        this.scopedLogger.info('Updated crypto state after bundle creation');
      }

      return data;
    } catch (error: any) {
      if (error?.response?.data?.error) {
        this.scopedLogger.error('Failed to create bundle', error.response.data);
        throw new Error(error.response.data.error);
      }
      this.scopedLogger.error('Failed to create bundle', error);
      throw error;
    }
  }

  // ============================================================================
  // Bundle Claiming API
  // ============================================================================

  /**
   * Claim a Red Pocket from a bundle
   *
   * @param bundle_uuid - Bundle UUID
   * @returns Claim result with amount and transaction hash
   *
   * @example
   * ```ts
   * const result = await redPocketService.claimBundle('6bbafeb7-...');
   * if (result.status === 1) {
   *   console.log('Claimed:', result.amount);
   * }
   * ```
   */
  async claimBundle(bundle_uuid: string): Promise<ClaimBundleResponse> {
    this.scopedLogger.info('Claiming bundle', { bundle_uuid });

    // Validate inputs
    if (!bundle_uuid) {
      throw new Error('Bundle UUID is required');
    }

    // Get current user's crypto data
    const crypto = getCurrentUserCrypto();
    if (!crypto?.salt || !crypto?.commitment || !crypto?.username) {
      throw new Error('User not logged in or missing credentials');
    }

    const request: ClaimBundleRequest = {
      bundle_uuid,
      salt: crypto.salt,
      commitment: crypto.commitment,
      username: crypto.username,
    };

    try {
      const data = await this.apiClient.post<ClaimBundleResponse>('/pm_claim_bundle', request);

      if (data.status === 1) {
        this.scopedLogger.info('Claimed successfully', { amount: data.amount });
        // Refresh balance after successful claim
        await refreshAfterClaim();
      } else if (data.status === -1) {
        this.scopedLogger.info('Already claimed by user');
      } else if (data.status === -2) {
        this.scopedLogger.warn('Bundle already reclaimed');
      } else if (data.status === -3) {
        this.scopedLogger.warn('Bundle expired');
      } else if (data.status === 0) {
        this.scopedLogger.info('All pockets claimed');
      }

      return data;
    } catch (error) {
      this.scopedLogger.error('Failed to claim bundle', error);
      throw error;
    }
  }

  /**
   * Claim bundle using current user's credentials
   * (Alias for claimBundle - kept for backward compatibility)
   *
   * @param bundleUuid - Bundle UUID
   * @returns Claim result
   *
   * @example
   * ```ts
   * const result = await redPocketService.claimBundleWithCurrentUser('6bbafeb7-...');
   * ```
   */
  async claimBundleWithCurrentUser(bundleUuid: string): Promise<ClaimBundleResponse> {
    return this.claimBundle(bundleUuid);
  }

  // ============================================================================
  // Bundle Status API
  // ============================================================================

  /**
   * Get bundle status including who has claimed
   *
   * @param bundleUuid - Bundle UUID
   * @returns Bundle status with claimed list
   *
   * @example
   * ```ts
   * const status = await redPocketService.getBundleStatus('6bbafeb7-...');
   * console.log('Claimed:', status.claimed.length, '/', status.quantity);
   * status.claimed.forEach(c => {
   *   console.log(c.username, 'claimed', c.amount);
   * });
   * ```
   */
  async getBundleStatus(bundleUuid: string): Promise<BundleStatusResponse> {
    this.scopedLogger.info('Getting bundle status', { bundle_uuid: bundleUuid });

    if (!bundleUuid) {
      throw new Error('Bundle UUID is required');
    }

    try {
      const data = await this.apiClient.post<BundleStatusResponse>('/pm_get_bundle_status', {
        bundle_uuid: bundleUuid,
      });

      this.scopedLogger.info('Bundle status retrieved', {
        total: data.quantity,
        claimed: data.claimed.length,
      });
      return data;
    } catch (error) {
      this.scopedLogger.error('Failed to get bundle status', error);
      throw error;
    }
  }

  // ============================================================================
  // Reclaim API
  // ============================================================================

  /**
   * Reclaim an expired, unclaimed Red Pocket and deposit it back to balance
   *
   * @param request - Reclaim request
   * @returns Reclaim result with transaction hashes
   *
   * @example
   * ```ts
   * const result = await redPocketService.reclaimAndDeposit({
   *   commitment: '0x...',
   *   lockbox_salt: '0x...'
   * });
   * if (result.status === 1) {
   *   console.log('Reclaimed:', result.amount);
   *   console.log('Reclaim TX:', result.reclaimTx);
   *   console.log('Deposit TX:', result.depositTx);
   * }
   * ```
   */
  async reclaimAndDeposit(request: ReclaimRequest): Promise<ReclaimResponse> {
    this.scopedLogger.info('Reclaiming and depositing');

    // Validate inputs
    if (!isValidHex(request.commitment)) {
      throw new Error('Invalid commitment: must be 32 bytes hex string');
    }
    if (!isValidHex(request.lockbox_salt)) {
      throw new Error('Invalid lockbox_salt: must be 32 bytes hex string');
    }

    try {
      const data = await this.apiClient.post<ReclaimResponse>(
        '/pm_bundle_reclaim_and_deposit',
        request
      );

      if (data.status === 1) {
        this.scopedLogger.info('Reclaimed successfully', { amount: data.amount });
        // Refresh balance after successful reclaim
        await refreshAfterClaim();
      } else if (data.status === -1) {
        this.scopedLogger.warn('Already claimed by someone');
      } else if (data.status === -2) {
        this.scopedLogger.warn('Already reclaimed');
      } else if (data.status === -3) {
        this.scopedLogger.warn('Not expired yet');
      }

      return data;
    } catch (error) {
      this.scopedLogger.error('Failed to reclaim and deposit', error);
      throw error;
    }
  }

  /**
   * Reclaim with current user's commitment
   *
   * @param lockboxSalt - Lockbox salt from bundle creation
   * @returns Reclaim result
   *
   * @example
   * ```ts
   * const result = await redPocketService.reclaimWithCurrentUser('0x...');
   * ```
   */
  async reclaimWithCurrentUser(lockboxSalt: string): Promise<ReclaimResponse> {
    this.scopedLogger.info('Reclaiming with current user');

    // Get current user's crypto data
    const crypto = getCurrentUserCrypto();
    if (!crypto?.commitment) {
      throw new Error('User not logged in or missing commitment');
    }

    return this.reclaimAndDeposit({
      commitment: crypto.commitment,
      lockbox_salt: lockboxSalt,
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate a unique client request ID for idempotency
   *
   * @returns Unique request ID (timestamp + random)
   *
   * @example
   * ```ts
   * const requestId = redPocketService.generateClientRequestId();
   * // "1737840000-abc123def456"
   * ```
   */
  generateClientRequestId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Calculate unlock time for a bundle
   *
   * @param duration - Duration in seconds
   * @returns Promise<unlock time timestamp>
   *
   * @example
   * ```ts
   * const unlockTime = await redPocketService.calculateUnlockTime(120);
   * console.log('Unlock at:', new Date(unlockTime * 1000));
   * ```
   */
  async calculateUnlockTime(duration: number): Promise<number> {
    const { timestamp } = await this.getTimestamp();
    return parseInt(timestamp) + duration;
  }

  /**
   * Check if bundle is expired
   *
   * @param unlockTime - Bundle unlock time
   * @returns True if expired
   *
   * @example
   * ```ts
   * const status = await redPocketService.getBundleStatus(uuid);
   * const expired = await redPocketService.isBundleExpired(status.unlock_time);
   * ```
   */
  async isBundleExpired(unlockTime: number): Promise<boolean> {
    const { timestamp } = await this.getTimestamp();
    return parseInt(timestamp) >= unlockTime;
  }

  /**
   * Validate bundle amount and quantity
   *
   * @param totalAmount - Total amount in micro-units
   * @param quantity - Number of pockets
   * @returns Validation result
   *
   * @example
   * ```ts
   * const valid = redPocketService.validateBundleAmount('100000000', 5);
   * if (!valid.isValid) {
   *   console.error(valid.error);
   * }
   * ```
   */
  validateBundleAmount(
    totalAmount: string,
    quantity: number
  ): { isValid: boolean; error?: string } {
    try {
      const amount = BigInt(totalAmount);
      const minAmount = BigInt(quantity) * BigInt(1_000_000); // Each pocket needs at least 1 USDT

      if (amount < minAmount) {
        return {
          isValid: false,
          error: `Total amount must be at least ${minAmount.toString()} (${quantity} USDT minimum)`,
        };
      }

      // Check if divisible by 1,000,000
      if (amount % BigInt(1_000_000) !== BigInt(0)) {
        return {
          isValid: false,
          error: 'Total amount must be divisible by 1,000,000',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid amount format',
      };
    }
  }

  /**
   * Format Red Pocket share link
   *
   * @param bundleUuid - Bundle UUID
   * @param baseUrl - Optional custom base URL
   * @returns Share link
   *
   * @example
   * ```ts
   * const link = redPocketService.formatShareLink('6bbafeb7-...');
   * // "https://redpocket.pingme.xyz/?bundle_uuid=6bbafeb7-..."
   * ```
   */
  formatShareLink(bundleUuid: string, baseUrl?: string): string {
    const url = baseUrl || this.baseUrl;
    return `${url}/?bundle_uuid=${bundleUuid}`;
  }
}
