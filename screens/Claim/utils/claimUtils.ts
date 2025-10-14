/**
 * Utility functions for Claim Payment Screen
 */

/**
 * Format timestamp to readable date string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string or '-' if invalid
 */
export const formatTime = (timestamp: any): string => {
  const n = Number(timestamp);
  if (!isFinite(n) || n <= 0) return '-';

  const d = new Date(n * 1000);
  const pad = (x: number) => String(x).padStart(2, '0');

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

/**
 * Validate deep link parameters for claim payment
 * @param params - Route parameters
 * @returns Validation result with error message if invalid
 */
export const validateClaimParams = (params: any) => {
  const { lockboxSalt } = params;

  const hasValidLockboxSalt = typeof lockboxSalt === 'string' && lockboxSalt.startsWith('0x');

  if (!hasValidLockboxSalt) {
    return {
      isValid: false,
      error: 'Invalid deep link: missing or invalid lockboxSalt',
    };
  }

  return { isValid: true };
};
