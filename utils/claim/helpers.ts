/**
 * General helper functions for Claim Payment
 * 
 * These are utility functions that don't fit into other specific categories.
 */

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format timestamp to readable date string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string or '-' if invalid
 * 
 * @example
 * ```ts
 * const timeStr = formatTime(lockbox.createTime);
 * // "2026-01-22 14:30:00"
 * ```
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
 * Format timestamp to relative time string (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string
 * 
 * @example
 * ```ts
 * const relative = formatTimeRelative(lockbox.createTime);
 * // "2 hours ago"
 * ```
 */
export const formatTimeRelative = (timestamp: any): string => {
  const n = Number(timestamp);
  if (!isFinite(n) || n <= 0) return 'Unknown';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - n;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  
  return formatTime(timestamp);
};
