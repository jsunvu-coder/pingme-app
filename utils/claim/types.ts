/**
 * Type definitions for Claim Payment functionality
 */

// ============================================================================
// Lockbox Types
// ============================================================================

export type LockboxStatus = 'OPEN' | 'EXPIRED' | 'CLAIMED' | 'RECLAIMED' | 'UNKNOWN';

export interface LockboxData {
  status: number; // 0=OPEN, 1=CLAIMED, 2=RECLAIMED
  unlockTime: number; // Unix timestamp
  currentTime: number; // Server current time
  createTime: number; // When lockbox was created
  amount: string; // Amount in micro units
  token: string; // Token contract address
}

export interface LockboxInfo extends LockboxData {
  derivedStatus: LockboxStatus;
  isClaimable: boolean;
  isExpired: boolean;
  formattedAmount?: string;
  tokenName?: string;
}

// ============================================================================
// Claim Parameters
// ============================================================================

export interface ClaimDeeplinkParams {
  username?: string; // Recipient email
  lockboxSalt?: string; // Required: lockbox salt (0x...)
  code?: string; // Optional: additional security code
  paymentId?: string; // Optional: payment ID
  signup?: boolean; // Optional: signup flow
  onClaimSuccess?: () => void; // Callback after claim success
}

export interface ClaimNavigationParams extends ClaimDeeplinkParams {
  mode?: 'login' | 'signup';
  headerFull?: boolean;
  lockboxProof?: string;
  amountUsdStr?: string;
  from?: 'login' | 'signup';
  tokenName?: string;
}

// ============================================================================
// Crypto Types
// ============================================================================

export interface ClaimCryptoData {
  inputData: string; // strToHex2(username, passphrase)
  lockboxProof: string; // Final proof to claim
  lockboxCommitment: string; // hash(lockboxProof)
  username: string;
  passphrase: string;
  lockboxSalt: string;
  code?: string;
}

export interface CommitData {
  lockboxProofHash: string; // ct1
  saltHash: string; // ct2
  commitmentHash: string; // ct3
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GetLockboxResponse {
  status: number;
  unlockTime: number;
  currentTime: number;
  createTime: number;
  amount: string;
  token: string;
}

export interface CommitStateResponse {
  commit_state: number; // 0=open, 1=valid, 2=blocked
}

export interface ClaimResponse {
  txHash: string;
  success: boolean;
}

export interface BalanceEntry {
  token: string;
  tokenAddress: string;
  amount: string;
  tokenName: string;
}

export interface GetBalanceResponse {
  balances: BalanceEntry[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ClaimParamsValidation extends ValidationResult {
  missingFields?: string[];
  invalidFields?: string[];
}

// ============================================================================
// Status Display Types
// ============================================================================

export interface StatusDisplayInfo {
  status: LockboxStatus;
  colorClass: string;
  subtitle: string;
  iconName?: string;
  canClaim: boolean;
  canVerify: boolean;
}

// ============================================================================
// Claim Flow State
// ============================================================================

export type ClaimPhase = 'verify' | 'claim' | 'success' | 'error';

export interface ClaimFlowState {
  phase: ClaimPhase;
  loading: boolean;
  error?: string;
  lockboxData?: LockboxData;
  lockboxProof?: string;
  txHash?: string;
}
