/**
 * Status utilities for Claim Payment
 * 
 * These functions help determine and display lockbox status,
 * including whether it can be claimed, colors, messages, etc.
 */

import type {
  LockboxData,
  LockboxStatus,
  LockboxInfo,
  StatusDisplayInfo,
} from './types';
import { Utils } from 'business/Utils';

// ============================================================================
// Status Derivation
// ============================================================================

/**
 * Derive user-friendly status from raw lockbox data
 * 
 * @param lockbox - Raw lockbox data from API
 * @returns User-friendly status string
 * 
 * @example
 * ```ts
 * const lockbox = await contractService.getLockbox(commitment);
 * const status = deriveLockboxStatus(lockbox);
 * // status: 'OPEN' | 'EXPIRED' | 'CLAIMED' | 'RECLAIMED' | 'UNKNOWN'
 * ```
 */
export function deriveLockboxStatus(lockbox: LockboxData | null): LockboxStatus {
  if (!lockbox) return 'UNKNOWN';

  const rawStatus = Number(lockbox.status);

  // Status 0 = not yet claimed/reclaimed
  if (rawStatus === 0) {
    const unlockTime = Number(lockbox.unlockTime ?? 0);
    const currentTime = Number(lockbox.currentTime ?? 0);
    
    // Check if still within claim period
    return unlockTime > currentTime ? 'OPEN' : 'EXPIRED';
  }

  // Status 1 = claimed by recipient
  if (rawStatus === 1) return 'CLAIMED';

  // Status 2 = reclaimed by sender
  if (rawStatus === 2) return 'RECLAIMED';

  return 'UNKNOWN';
}

/**
 * Get complete lockbox info including derived status and claimability
 * 
 * @param lockbox - Raw lockbox data
 * @returns Extended lockbox info with derived fields
 * 
 * @example
 * ```ts
 * const info = getLockboxInfo(lockbox);
 * if (info.isClaimable) {
 *   // Show claim button
 * }
 * console.log(info.formattedAmount); // "10.00"
 * ```
 */
export function getLockboxInfo(lockbox: LockboxData | null): LockboxInfo | null {
  if (!lockbox) return null;

  const derivedStatus = deriveLockboxStatus(lockbox);
  const isClaimable = derivedStatus === 'OPEN';
  const isExpired = derivedStatus === 'EXPIRED';

  // Format amount
  let formattedAmount: string | undefined;
  try {
    const tokenDecimals = Utils.getTokenDecimals(lockbox.token);
    formattedAmount = Utils.formatMicroToUsd(
      lockbox.amount,
      undefined,
      { grouping: true, empty: '' },
      tokenDecimals
    );
  } catch (error) {
    console.warn('Failed to format lockbox amount:', error);
  }

  // Get token name
  let tokenName: string | undefined;
  try {
    tokenName = Utils.getTokenName(lockbox.token);
    if (Utils.isStablecoin(tokenName)) {
      tokenName = undefined; // Don't show token name for stablecoins
    }
  } catch (error) {
    console.warn('Failed to get token name:', error);
  }

  return {
    ...lockbox,
    derivedStatus,
    isClaimable,
    isExpired,
    formattedAmount,
    tokenName,
  };
}

// ============================================================================
// Status Display Helpers
// ============================================================================

/**
 * Get display information for a given status
 * 
 * @param status - Lockbox status
 * @returns Display info including color, subtitle, icon, etc.
 * 
 * @example
 * ```ts
 * const display = getStatusDisplay('OPEN');
 * console.log(display.colorClass); // 'text-emerald-600'
 * console.log(display.subtitle); // 'Payment is available to claim.'
 * console.log(display.canClaim); // true
 * ```
 */
export function getStatusDisplay(status: LockboxStatus): StatusDisplayInfo {
  switch (status) {
    case 'OPEN':
      return {
        status,
        colorClass: 'text-emerald-600',
        subtitle: 'Payment is available to claim.',
        iconName: 'check-circle',
        canClaim: true,
        canVerify: true,
      };

    case 'EXPIRED':
      return {
        status,
        colorClass: 'text-orange-600',
        subtitle: 'But payment has expired.',
        iconName: 'clock',
        canClaim: false,
        canVerify: true,
      };

    case 'CLAIMED':
      return {
        status,
        colorClass: 'text-blue-600',
        subtitle: 'But payment has already been claimed.',
        iconName: 'check-all',
        canClaim: false,
        canVerify: true,
      };

    case 'RECLAIMED':
      return {
        status,
        colorClass: 'text-neutral-600',
        subtitle: 'But payment has been reclaimed by sender.',
        iconName: 'arrow-left',
        canClaim: false,
        canVerify: true,
      };

    case 'UNKNOWN':
    default:
      return {
        status: 'UNKNOWN',
        colorClass: 'text-neutral-600',
        subtitle: '',
        canClaim: false,
        canVerify: false,
      };
  }
}

/**
 * Get color class for a status (for styling)
 * 
 * @param status - Lockbox status
 * @returns Tailwind color class string
 * 
 * @example
 * ```ts
 * const colorClass = getStatusColorClass('OPEN');
 * // 'text-emerald-600'
 * ```
 */
export function getStatusColorClass(status: LockboxStatus): string {
  return getStatusDisplay(status).colorClass;
}

/**
 * Get subtitle text for a status
 * 
 * @param status - Lockbox status
 * @returns Subtitle text to display
 * 
 * @example
 * ```ts
 * const subtitle = getStatusSubtitle('EXPIRED');
 * // 'But payment has expired.'
 * ```
 */
export function getStatusSubtitle(status: LockboxStatus): string {
  return getStatusDisplay(status).subtitle;
}

// ============================================================================
// Claimability Checks
// ============================================================================

/**
 * Check if a lockbox can be claimed based on its data
 * 
 * @param lockbox - Lockbox data
 * @returns True if the lockbox can be claimed
 * 
 * @example
 * ```ts
 * if (canClaimLockbox(lockbox)) {
 *   // Enable claim button
 * } else {
 *   // Disable claim button
 * }
 * ```
 */
export function canClaimLockbox(lockbox: LockboxData | null): boolean {
  if (!lockbox) return false;
  const status = deriveLockboxStatus(lockbox);
  return status === 'OPEN';
}

/**
 * Check if a lockbox is expired
 * 
 * @param lockbox - Lockbox data
 * @returns True if expired
 * 
 * @example
 * ```ts
 * if (isLockboxExpired(lockbox)) {
 *   showMessage('This payment has expired');
 * }
 * ```
 */
export function isLockboxExpired(lockbox: LockboxData | null): boolean {
  if (!lockbox) return false;
  const status = deriveLockboxStatus(lockbox);
  return status === 'EXPIRED';
}

/**
 * Check if a lockbox has already been claimed
 * 
 * @param lockbox - Lockbox data
 * @returns True if claimed (by recipient or reclaimed by sender)
 * 
 * @example
 * ```ts
 * if (isLockboxClaimed(lockbox)) {
 *   showMessage('This payment has already been processed');
 * }
 * ```
 */
export function isLockboxClaimed(lockbox: LockboxData | null): boolean {
  if (!lockbox) return false;
  const status = deriveLockboxStatus(lockbox);
  return status === 'CLAIMED' || status === 'RECLAIMED';
}

// ============================================================================
// Time Calculations
// ============================================================================

/**
 * Get time remaining until lockbox expires
 * 
 * @param lockbox - Lockbox data
 * @returns Seconds remaining, or 0 if expired/invalid
 * 
 * @example
 * ```ts
 * const remaining = getTimeRemaining(lockbox);
 * if (remaining > 0) {
 *   console.log(`${Math.floor(remaining / 3600)} hours remaining`);
 * }
 * ```
 */
export function getTimeRemaining(lockbox: LockboxData | null): number {
  if (!lockbox) return 0;

  const unlockTime = Number(lockbox.unlockTime ?? 0);
  const currentTime = Number(lockbox.currentTime ?? 0);

  const remaining = unlockTime - currentTime;
  return Math.max(0, remaining);
}

/**
 * Check if lockbox will expire soon (within threshold)
 * 
 * @param lockbox - Lockbox data
 * @param thresholdSeconds - Threshold in seconds (default 24 hours)
 * @returns True if expiring soon
 * 
 * @example
 * ```ts
 * if (isExpiringSoon(lockbox, 3600)) { // 1 hour
 *   showWarning('This payment expires in less than 1 hour!');
 * }
 * ```
 */
export function isExpiringSoon(
  lockbox: LockboxData | null,
  thresholdSeconds: number = 86400 // 24 hours default
): boolean {
  const remaining = getTimeRemaining(lockbox);
  return remaining > 0 && remaining < thresholdSeconds;
}

/**
 * Get human-readable time remaining string
 * 
 * @param lockbox - Lockbox data
 * @returns Human readable string like "2 days, 3 hours"
 * 
 * @example
 * ```ts
 * const timeStr = getTimeRemainingString(lockbox);
 * // "2 days, 3 hours"
 * ```
 */
export function getTimeRemainingString(lockbox: LockboxData | null): string {
  const remaining = getTimeRemaining(lockbox);
  
  if (remaining <= 0) {
    return 'Expired';
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (parts.length === 0 && minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }

  return parts.join(', ') || 'Less than 1 minute';
}
