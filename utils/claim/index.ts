/**
 * Claim Payment Utilities
 * 
 * Reusable utilities for claim payment functionality.
 * These utilities can be used across different features that interact with
 * lockbox claims, payments, and related operations.
 * 
 * @example
 * ```ts
 * // Import specific functions
 * import { computeLockboxProof, getLockboxInfo } from '@/utils/claim';
 * 
 * // Or import all
 * import * as ClaimUtils from '@/utils/claim';
 * ```
 * 
 * @module utils/claim
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type {
  // Lockbox types
  LockboxStatus,
  LockboxData,
  LockboxInfo,
  
  // Claim parameters
  ClaimDeeplinkParams,
  ClaimNavigationParams,
  
  // Crypto types
  ClaimCryptoData,
  CommitData,
  
  // API response types
  GetLockboxResponse,
  CommitStateResponse,
  ClaimResponse,
  BalanceEntry,
  GetBalanceResponse,
  
  // Validation types
  ValidationResult,
  ClaimParamsValidation,
  
  // Display types
  StatusDisplayInfo,
  
  // Flow state
  ClaimPhase,
  ClaimFlowState,
} from './types';

// ============================================================================
// Cryptographic Functions
// ============================================================================

export {
  computeLockboxProof,
  computeCommitHashes,
  validateCryptoInputs,
  isValidHex,
  getLockboxCommitment,
  getLockboxProof,
} from './crypto';

// ============================================================================
// Status Functions
// ============================================================================

export {
  deriveLockboxStatus,
  getLockboxInfo,
  getStatusDisplay,
  getStatusColorClass,
  getStatusSubtitle,
  canClaimLockbox,
  isLockboxExpired,
  isLockboxClaimed,
  getTimeRemaining,
  isExpiringSoon,
  getTimeRemainingString,
} from './status';

// ============================================================================
// API Functions
// ============================================================================

export {
  getLockbox,
  hasLockbox,
  getCommitState,
  submitCommit,
  ensureCommitReady,
  claimWithCurrentUser,
  executeFullClaimFlow,
  refreshAfterClaim,
  isUserLoggedIn,
  getCurrentUserCrypto,
} from './api';

// ============================================================================
// Validation Functions
// ============================================================================

export {
  validateClaimDeeplinkParams,
  validateLockboxSalt,
  validatePassphrase,
  validateUsername,
  validateClaimInputs,
  validateHexString,
  canNavigateToClaimScreen,
} from './validation';

// ============================================================================
// Helper Functions
// ============================================================================

export {
  formatTime,
  formatTimeRelative,
} from './helpers';
