/**
 * API utilities for Claim Payment
 *
 * High-level wrapper functions for claim-related API calls.
 * These functions provide a cleaner interface and better error handling.
 */

import { ContractService } from 'business/services/ContractService';
import { AuthService } from 'business/services/AuthService';
import { BalanceService } from 'business/services/BalanceService';
import { RecordService } from 'business/services/RecordService';
import { computeCommitHashes } from './crypto';
import type { LockboxData, CommitStateResponse, ClaimResponse } from './types';

// ============================================================================
// Service Instances (lazy initialization)
// ============================================================================

let contractService: ContractService;
let authService: AuthService;
let balanceService: BalanceService;
let recordService: RecordService;

function getServices() {
  if (!contractService) contractService = ContractService.getInstance();
  if (!authService) authService = AuthService.getInstance();
  if (!balanceService) balanceService = BalanceService.getInstance();
  if (!recordService) recordService = RecordService.getInstance();

  return { contractService, authService, balanceService, recordService };
}

// ============================================================================
// Lockbox API
// ============================================================================

/**
 * Get lockbox data by commitment
 *
 * @param lockboxCommitment - Lockbox commitment hash
 * @returns Lockbox data
 *
 * @example
 * ```ts
 * const lockbox = await getLockbox(commitment);
 * console.log(lockbox.status, lockbox.amount);
 * ```
 */
export async function getLockbox(lockboxCommitment: string): Promise<LockboxData> {
  const { contractService } = getServices();

  try {
    const result = await contractService.getLockbox(lockboxCommitment);
    return result;
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to get lockbox:', error);
    throw error;
  }
}

/**
 * Check if a lockbox exists
 *
 * @param lockboxCommitment - Lockbox commitment hash
 * @returns True if lockbox exists
 *
 * @example
 * ```ts
 * const exists = await hasLockbox(commitment);
 * if (!exists) {
 *   showError('Lockbox not found');
 * }
 * ```
 */
export async function hasLockbox(lockboxCommitment: string): Promise<boolean> {
  const { contractService } = getServices();

  try {
    const result = await contractService.hasLockbox(lockboxCommitment);
    return result.has_lockbox === true;
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to check lockbox existence:', error);
    return false;
  }
}

// ============================================================================
// Commit-Reveal API
// ============================================================================

/**
 * Get commit state for the commit-reveal pattern
 *
 * @param lockboxProof - Lockbox proof to claim
 * @param userSalt - User's account salt
 * @param userCommitment - User's balance commitment
 * @returns Commit state (0=need commit, 1=valid, 2=blocked)
 *
 * @example
 * ```ts
 * const state = await getCommitState(proof, salt, commitment);
 * if (state.commit_state === 0) {
 *   await submitCommit(proof, salt, commitment);
 * }
 * ```
 */
export async function getCommitState(
  lockboxProof: string,
  userSalt: string,
  userCommitment: string
): Promise<CommitStateResponse> {
  const { contractService } = getServices();

  const commitData = computeCommitHashes(lockboxProof, userSalt, userCommitment);

  try {
    const result = await contractService.getCommitState(
      commitData.lockboxProofHash,
      commitData.saltHash,
      commitData.commitmentHash
    );
    return result;
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to get commit state:', error);
    throw error;
  }
}

/**
 * Submit commit for the commit-reveal pattern
 *
 * @param lockboxProof - Lockbox proof to claim
 * @param userSalt - User's account salt
 * @param userCommitment - User's balance commitment
 * @returns Commit result
 *
 * @example
 * ```ts
 * await submitCommit(proof, salt, commitment);
 * // Now can proceed to claim
 * ```
 */
export async function submitCommit(
  lockboxProof: string,
  userSalt: string,
  userCommitment: string
): Promise<any> {
  const { contractService } = getServices();

  const commitData = computeCommitHashes(lockboxProof, userSalt, userCommitment);

  try {
    const result = await contractService.commit(
      commitData.lockboxProofHash,
      commitData.saltHash,
      commitData.commitmentHash
    );
    return result;
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to submit commit:', error);
    throw error;
  }
}

/**
 * Check commit state and submit if needed (convenience function)
 *
 * @param lockboxProof - Lockbox proof to claim
 * @param userSalt - User's account salt
 * @param userCommitment - User's balance commitment
 * @returns True if ready to claim (commit valid or just submitted)
 *
 * @example
 * ```ts
 * const ready = await ensureCommitReady(proof, salt, commitment);
 * if (ready) {
 *   await executeClaim(proof, salt, commitment);
 * }
 * ```
 */
export async function ensureCommitReady(
  lockboxProof: string,
  userSalt: string,
  userCommitment: string
): Promise<boolean> {
  try {
    const state = await getCommitState(lockboxProof, userSalt, userCommitment);

    if (state.commit_state === 0) {
      // Need to submit commit
      await submitCommit(lockboxProof, userSalt, userCommitment);
      return true;
    } else if (state.commit_state === 1) {
      // Already valid
      return true;
    } else {
      // Blocked
      console.error('❌ [ClaimAPI] Commit blocked by another party');
      return false;
    }
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to ensure commit ready:', error);
    throw error;
  }
}

// ============================================================================
// Claim API
// ============================================================================

/**
 * Execute claim using current user's credentials
 *
 * @param lockboxProof - Lockbox proof computed from passphrase
 * @returns Claim result with transaction hash
 *
 * @example
 * ```ts
 * const result = await claimWithCurrentUser(lockboxProof);
 * console.log('Claimed! TX:', result.txHash);
 * ```
 */
export async function claimWithCurrentUser(lockboxProof: string): Promise<void> {
  const { authService } = getServices();

  try {
    await authService.claimWithCurrentCrypto(lockboxProof);
  } catch (error) {
    console.error('❌ [ClaimAPI] Claim failed:', error);
    throw error;
  }
}

/**
 * Execute full claim flow with commit-reveal pattern
 *
 * @param lockboxProof - Lockbox proof
 * @returns True if claim successful
 *
 * @example
 * ```ts
 * try {
 *   await executeFullClaimFlow(lockboxProof);
 *   // Navigate to success screen
 * } catch (error) {
 *   // Show error message
 * }
 * ```
 */
export async function executeFullClaimFlow(lockboxProof: string): Promise<boolean> {
  const { contractService } = getServices();

  try {
    // Get user credentials
    const crypto = contractService.getCrypto();
    if (!crypto?.salt || !crypto?.commitment) {
      throw new Error('User not logged in or missing credentials');
    }

    // Step 1: Ensure commit is ready
    const ready = await ensureCommitReady(lockboxProof, crypto.salt, crypto.commitment);
    if (!ready) {
      throw new Error('Commit blocked or failed');
    }

    // Step 2: Execute claim
    await claimWithCurrentUser(lockboxProof);

    // Step 3: Refresh balance and records
    await refreshAfterClaim();

    return true;
  } catch (error) {
    console.error('❌ [ClaimAPI] Full claim flow failed:', error);
    throw error;
  }
}

// ============================================================================
// Post-Claim Updates
// ============================================================================

/**
 * Refresh balance and transaction history after claim
 *
 * @example
 * ```ts
 * await executeClaim(proof);
 * await refreshAfterClaim(); // Update UI
 * ```
 */
export async function refreshAfterClaim(): Promise<void> {
  const { balanceService, recordService } = getServices();

  try {
    // Refresh balance first
    await balanceService.getBalance();

    // Then refresh transaction history (fire and forget)
    recordService.updateRecord().catch((err) => {
      console.warn('⚠️ [ClaimAPI] Failed to refresh records:', err);
    });
  } catch (error) {
    console.warn('⚠️ [ClaimAPI] Failed to refresh after claim:', error);
    // Don't throw - claim was successful even if refresh fails
  }
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Check if user is logged in
 *
 * @returns True if user is logged in
 *
 * @example
 * ```ts
 * if (!(await isUserLoggedIn())) {
 *   // Navigate to login screen
 * }
 * ```
 */
export async function isUserLoggedIn(): Promise<boolean> {
  const { authService } = getServices();

  try {
    return await authService.isLoggedIn();
  } catch (error) {
    console.error('❌ [ClaimAPI] Failed to check login status:', error);
    return false;
  }
}

/**
 * Get current user's crypto credentials (if logged in)
 *
 * @returns User crypto data or null if not logged in
 *
 * @example
 * ```ts
 * const crypto = getCurrentUserCrypto();
 * if (crypto) {
 *   console.log('User:', crypto.username);
 * }
 * ```
 */
export function getCurrentUserCrypto(): any {
  const { contractService } = getServices();
  return contractService.getCrypto();
}
