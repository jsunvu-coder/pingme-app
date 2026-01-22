/**
 * Cryptographic utilities for Claim Payment
 * 
 * These functions handle all cryptographic operations needed for the claim flow:
 * - Computing lockbox proof from username + passphrase
 * - Computing commitment hashes
 * - Handling additional security codes
 */

import { CryptoUtils } from 'business/CryptoUtils';
import { solidityPacked } from 'ethers';
import type { ClaimCryptoData, CommitData } from './types';

// ============================================================================
// Lockbox Proof Computation
// ============================================================================

/**
 * Compute lockbox proof from username and passphrase
 * 
 * @param username - User's email/username (will be lowercased and trimmed)
 * @param passphrase - Passphrase entered by user (will be trimmed)
 * @param lockboxSalt - Salt from deeplink (must start with 0x)
 * @param code - Optional additional security code
 * @returns Complete crypto data including proof and commitment
 * 
 * @example
 * ```ts
 * const crypto = computeLockboxProof(
 *   'user@example.com',
 *   'my secret phrase',
 *   '0x123...',
 *   '0xabc...' // optional code
 * );
 * // crypto.lockboxProof can be used for claim
 * // crypto.lockboxCommitment can be used to get lockbox data
 * ```
 */
export function computeLockboxProof(
  username: string,
  passphrase: string,
  lockboxSalt: string,
  code?: string
): ClaimCryptoData {
  // Normalize inputs
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedPassphrase = passphrase.trim();

  // Step 1: Convert username + passphrase to hex
  const inputData = CryptoUtils.strToHex2(normalizedUsername, normalizedPassphrase);
  if (!inputData) {
    throw new Error('Failed to compute inputData from username and passphrase');
  }

  // Step 2: Compute base proof with salt
  const baseProof = CryptoUtils.globalHash2(inputData, lockboxSalt);
  if (!baseProof) {
    throw new Error('Failed to compute base proof');
  }

  // Step 3: If code exists, combine it with base proof
  let finalProof: string;
  if (code) {
    const codeBytes = CryptoUtils.toBytesLike(code);
    const baseProofHash = CryptoUtils.globalHash(baseProof);
    if (!baseProofHash) {
      throw new Error('Failed to hash base proof');
    }

    const packed = solidityPacked(['bytes32', 'bytes32'], [codeBytes, baseProofHash]);
    const proofWithCode = CryptoUtils.globalHash(packed);
    if (!proofWithCode) {
      throw new Error('Failed to compute proof with code');
    }
    finalProof = proofWithCode;
  } else {
    finalProof = baseProof;
  }

  // Step 4: Compute commitment
  const lockboxCommitment = CryptoUtils.globalHash(finalProof);
  if (!lockboxCommitment) {
    throw new Error('Failed to compute lockbox commitment');
  }

  return {
    inputData,
    lockboxProof: finalProof,
    lockboxCommitment,
    username: normalizedUsername,
    passphrase: normalizedPassphrase,
    lockboxSalt,
    code,
  };
}

// ============================================================================
// Commit Hash Computation (for Commit-Reveal Pattern)
// ============================================================================

/**
 * Compute commit hashes for the commit-reveal pattern
 * 
 * @param lockboxProof - The lockbox proof to claim
 * @param userSalt - User's account salt
 * @param userCommitment - User's balance commitment
 * @returns Commit data with all three hashes (ct1, ct2, ct3)
 * 
 * @example
 * ```ts
 * const commitData = computeCommitHashes(
 *   lockboxProof,
 *   crypto.salt,
 *   crypto.commitment
 * );
 * // Use for /pm_get_commit_state and /pm_commit
 * await contractService.getCommitState(
 *   commitData.lockboxProofHash,
 *   commitData.saltHash,
 *   commitData.commitmentHash
 * );
 * ```
 */
export function computeCommitHashes(
  lockboxProof: string,
  userSalt: string,
  userCommitment: string
): CommitData {
  const lockboxProofHash = CryptoUtils.globalHash(lockboxProof);
  if (!lockboxProofHash) {
    throw new Error('Failed to compute lockbox proof hash');
  }

  const saltHash = CryptoUtils.globalHash(userSalt);
  if (!saltHash) {
    throw new Error('Failed to compute salt hash');
  }

  const commitmentHash = CryptoUtils.globalHash(userCommitment);
  if (!commitmentHash) {
    throw new Error('Failed to compute commitment hash');
  }

  return {
    lockboxProofHash,
    saltHash,
    commitmentHash,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that all required crypto inputs are present
 * 
 * @param username - Username/email
 * @param lockboxSalt - Lockbox salt from deeplink
 * @returns True if all inputs are valid
 * 
 * @example
 * ```ts
 * if (!validateCryptoInputs(username, lockboxSalt)) {
 *   throw new Error('Invalid crypto inputs');
 * }
 * ```
 */
export function validateCryptoInputs(username?: string, lockboxSalt?: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  if (!lockboxSalt || typeof lockboxSalt !== 'string' || !lockboxSalt.startsWith('0x')) {
    return false;
  }

  return true;
}

/**
 * Check if a hex string is valid (starts with 0x and has valid length)
 * 
 * @param hex - Hex string to validate
 * @param expectedLength - Expected length (including 0x prefix), default 66 for bytes32
 * @returns True if valid hex string
 * 
 * @example
 * ```ts
 * if (!isValidHex(lockboxSalt)) {
 *   console.error('Invalid hex format');
 * }
 * ```
 */
export function isValidHex(hex?: string, expectedLength: number = 66): boolean {
  if (!hex || typeof hex !== 'string') {
    return false;
  }

  if (!hex.startsWith('0x')) {
    return false;
  }

  if (hex.length !== expectedLength) {
    return false;
  }

  // Check if all characters after 0x are valid hex
  const hexChars = hex.slice(2);
  return /^[0-9a-fA-F]+$/.test(hexChars);
}

// ============================================================================
// Quick Access Functions
// ============================================================================

/**
 * Quick function to compute lockbox commitment from username and passphrase
 * (without returning full crypto data)
 * 
 * @param username - Username/email
 * @param passphrase - Passphrase
 * @param lockboxSalt - Lockbox salt
 * @param code - Optional security code
 * @returns Just the lockbox commitment hash
 * 
 * @example
 * ```ts
 * const commitment = getLockboxCommitment('user@example.com', 'secret', '0x123...');
 * const lockbox = await contractService.getLockbox(commitment);
 * ```
 */
export function getLockboxCommitment(
  username: string,
  passphrase: string,
  lockboxSalt: string,
  code?: string
): string {
  const crypto = computeLockboxProof(username, passphrase, lockboxSalt, code);
  return crypto.lockboxCommitment;
}

/**
 * Quick function to compute just the lockbox proof
 * 
 * @param username - Username/email
 * @param passphrase - Passphrase
 * @param lockboxSalt - Lockbox salt
 * @param code - Optional security code
 * @returns Just the lockbox proof (for claim)
 * 
 * @example
 * ```ts
 * const proof = getLockboxProof('user@example.com', 'secret', '0x123...');
 * await authService.claimWithCurrentCrypto(proof);
 * ```
 */
export function getLockboxProof(
  username: string,
  passphrase: string,
  lockboxSalt: string,
  code?: string
): string {
  const crypto = computeLockboxProof(username, passphrase, lockboxSalt, code);
  return crypto.lockboxProof;
}
