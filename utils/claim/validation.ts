/**
 * Validation utilities for Claim Payment
 * 
 * These functions validate deeplink parameters, user inputs,
 * and ensure data integrity before making API calls.
 */

import type { ClaimDeeplinkParams, ClaimParamsValidation, ValidationResult } from './types';

// ============================================================================
// Deeplink Parameters Validation
// ============================================================================

/**
 * Validate complete deeplink parameters for claim
 * 
 * @param params - Deeplink parameters
 * @returns Validation result with details about missing/invalid fields
 * 
 * @example
 * ```ts
 * const validation = validateClaimDeeplinkParams(params);
 * if (!validation.isValid) {
 *   console.error('Invalid params:', validation.error);
 *   console.error('Missing:', validation.missingFields);
 * }
 * ```
 */
export function validateClaimDeeplinkParams(
  params: Partial<ClaimDeeplinkParams>
): ClaimParamsValidation {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // lockboxSalt is required
  if (!params.lockboxSalt) {
    missingFields.push('lockboxSalt');
  } else if (typeof params.lockboxSalt !== 'string') {
    invalidFields.push('lockboxSalt (must be string)');
  } else if (!params.lockboxSalt.startsWith('0x')) {
    invalidFields.push('lockboxSalt (must start with 0x)');
  } else if (params.lockboxSalt.length !== 66) {
    invalidFields.push('lockboxSalt (must be 66 characters)');
  }

  // username is optional but if provided, should be valid
  if (params.username !== undefined) {
    if (typeof params.username !== 'string') {
      invalidFields.push('username (must be string)');
    } else if (params.username.trim().length === 0) {
      invalidFields.push('username (cannot be empty)');
    }
  }

  // code is optional but if provided, should be valid hex
  if (params.code !== undefined) {
    if (typeof params.code !== 'string') {
      invalidFields.push('code (must be string)');
    } else if (!params.code.startsWith('0x')) {
      invalidFields.push('code (must start with 0x)');
    }
  }

  const isValid = missingFields.length === 0 && invalidFields.length === 0;

  if (!isValid) {
    const errorParts: string[] = [];
    if (missingFields.length > 0) {
      errorParts.push(`Missing fields: ${missingFields.join(', ')}`);
    }
    if (invalidFields.length > 0) {
      errorParts.push(`Invalid fields: ${invalidFields.join(', ')}`);
    }
    
    return {
      isValid: false,
      error: errorParts.join('. '),
      missingFields,
      invalidFields,
    };
  }

  return {
    isValid: true,
    missingFields: [],
    invalidFields: [],
  };
}

/**
 * Quick validation for lockboxSalt only (most common case)
 * 
 * @param lockboxSalt - Lockbox salt from deeplink
 * @returns Simple validation result
 * 
 * @example
 * ```ts
 * const { isValid, error } = validateLockboxSalt(params.lockboxSalt);
 * if (!isValid) {
 *   showError(error);
 * }
 * ```
 */
export function validateLockboxSalt(lockboxSalt?: string): ValidationResult {
  if (!lockboxSalt) {
    return {
      isValid: false,
      error: 'Missing lockboxSalt parameter',
    };
  }

  if (typeof lockboxSalt !== 'string') {
    return {
      isValid: false,
      error: 'lockboxSalt must be a string',
    };
  }

  if (!lockboxSalt.startsWith('0x')) {
    return {
      isValid: false,
      error: 'lockboxSalt must start with 0x',
    };
  }

  if (lockboxSalt.length !== 66) {
    return {
      isValid: false,
      error: `lockboxSalt must be 66 characters (got ${lockboxSalt.length})`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// User Input Validation
// ============================================================================

/**
 * Validate passphrase input
 * 
 * @param passphrase - User-entered passphrase
 * @param allowEmpty - Whether to allow empty passphrase (default: false)
 * @returns Validation result
 * 
 * @example
 * ```ts
 * const { isValid, error } = validatePassphrase(userInput);
 * if (!isValid) {
 *   setError(error);
 * }
 * ```
 */
export function validatePassphrase(
  passphrase: string,
  allowEmpty: boolean = false
): ValidationResult {
  if (typeof passphrase !== 'string') {
    return {
      isValid: false,
      error: 'Passphrase must be a string',
    };
  }

  const trimmed = passphrase.trim();
  
  if (!allowEmpty && trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Passphrase cannot be empty',
    };
  }

  // Optional: Add more validation rules
  // e.g., minimum length, character requirements, etc.

  return { isValid: true };
}

/**
 * Validate username/email
 * 
 * @param username - Username or email
 * @param requireEmail - Whether to require @ symbol (default: false)
 * @returns Validation result
 * 
 * @example
 * ```ts
 * const { isValid, error } = validateUsername(email, true);
 * if (!isValid) {
 *   showError(error);
 * }
 * ```
 */
export function validateUsername(
  username?: string,
  requireEmail: boolean = false
): ValidationResult {
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username is required',
    };
  }

  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Username cannot be empty',
    };
  }

  if (requireEmail && !trimmed.includes('@')) {
    return {
      isValid: false,
      error: 'Valid email address required',
    };
  }

  // Optional: Add email format validation
  if (trimmed.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid email format',
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// Combined Validation
// ============================================================================

/**
 * Validate all required inputs for claim verification
 * 
 * @param username - Username/email
 * @param passphrase - Passphrase
 * @param lockboxSalt - Lockbox salt
 * @returns Validation result
 * 
 * @example
 * ```ts
 * const { isValid, error } = validateClaimInputs(username, passphrase, lockboxSalt);
 * if (!isValid) {
 *   showError(error);
 *   return;
 * }
 * // Proceed with verification
 * ```
 */
export function validateClaimInputs(
  username?: string,
  passphrase?: string,
  lockboxSalt?: string
): ValidationResult {
  // Validate username (optional)
  if (username !== undefined) {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return usernameValidation;
    }
  }

  // Validate passphrase
  if (passphrase === undefined) {
    return {
      isValid: false,
      error: 'Passphrase is required',
    };
  }

  const passphraseValidation = validatePassphrase(passphrase, true); // Allow empty for some flows
  if (!passphraseValidation.isValid) {
    return passphraseValidation;
  }

  // Validate lockboxSalt
  const saltValidation = validateLockboxSalt(lockboxSalt);
  if (!saltValidation.isValid) {
    return saltValidation;
  }

  return { isValid: true };
}

// ============================================================================
// Hex String Validation
// ============================================================================

/**
 * Validate hex string format
 * 
 * @param hex - Hex string to validate
 * @param expectedLength - Expected length including 0x (default: 66 for bytes32)
 * @returns Validation result
 * 
 * @example
 * ```ts
 * const { isValid, error } = validateHexString(code);
 * if (!isValid) {
 *   console.error(error);
 * }
 * ```
 */
export function validateHexString(
  hex?: string,
  expectedLength: number = 66
): ValidationResult {
  if (!hex) {
    return {
      isValid: false,
      error: 'Hex string is required',
    };
  }

  if (typeof hex !== 'string') {
    return {
      isValid: false,
      error: 'Hex string must be a string',
    };
  }

  if (!hex.startsWith('0x')) {
    return {
      isValid: false,
      error: 'Hex string must start with 0x',
    };
  }

  if (hex.length !== expectedLength) {
    return {
      isValid: false,
      error: `Hex string must be ${expectedLength} characters (got ${hex.length})`,
    };
  }

  // Validate hex characters
  const hexChars = hex.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexChars)) {
    return {
      isValid: false,
      error: 'Hex string contains invalid characters',
    };
  }

  return { isValid: true };
}

// ============================================================================
// Navigation Parameters Validation
// ============================================================================

/**
 * Validate parameters before navigating to ClaimPaymentScreen
 * 
 * @param params - Navigation params
 * @returns True if params are valid for navigation
 * 
 * @example
 * ```ts
 * if (canNavigateToClaimScreen(params)) {
 *   navigation.navigate('ClaimPaymentScreen', params);
 * } else {
 *   console.error('Invalid claim parameters');
 * }
 * ```
 */
export function canNavigateToClaimScreen(params: any): boolean {
  if (!params || typeof params !== 'object') {
    return false;
  }

  const validation = validateLockboxSalt(params.lockboxSalt);
  return validation.isValid;
}
