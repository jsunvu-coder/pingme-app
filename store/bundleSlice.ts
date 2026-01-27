import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from './index';

export interface BundleInfo {
  bundle_uuid: string;
}

export interface AccountBundles {
  // Key is tx_hash, value is bundle info
  [txHash: string]: BundleInfo;
}

export interface BundleState {
  // Store bundles per account using email/username as key
  byAccount: Record<string, AccountBundles>;
}

const initialState: BundleState = {
  byAccount: {},
};

const bundleSlice = createSlice({
  name: 'bundle',
  initialState,
  reducers: {
    addBundle(
      state: BundleState,
      action: PayloadAction<{
        accountEmail: string;
        txHash: string;
        bundle_uuid: string;
      }>
    ) {
      const accountKey = action.payload.accountEmail.toLowerCase();
      if (!state.byAccount[accountKey]) {
        state.byAccount[accountKey] = {};
      }

      const accountBundles = state.byAccount[accountKey];
      accountBundles[action.payload.txHash.toLowerCase()] = {
        bundle_uuid: action.payload.bundle_uuid,
      };
    },
    clearBundles(state: BundleState, action: PayloadAction<{ accountEmail?: string }>) {
      if (action.payload.accountEmail) {
        // Clear bundles for specific account
        const accountKey = action.payload.accountEmail.toLowerCase();
        delete state.byAccount[accountKey];
      } else {
        // Clear all bundles
        state.byAccount = {};
      }
    },
  },
});

export const { addBundle, clearBundles } = bundleSlice.actions;
export default bundleSlice.reducer;

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get bundle info for a specific txHash and account email
 * @param state - RootState
 * @param accountEmail - Account email
 * @param txHash - Transaction hash (will be lowercased)
 * @returns BundleInfo if found, undefined otherwise
 */
export const selectBundleByTxHash = (
  state: RootState,
  accountEmail: string | undefined,
  txHash: string | undefined
): BundleInfo | undefined => {
  if (!accountEmail || !txHash) {
    return undefined;
  }

  const accountKey = accountEmail.toLowerCase();
  const hashKey = txHash.toLowerCase();
  const accountBundles = state.bundle?.byAccount?.[accountKey];

  return accountBundles?.[hashKey];
};

/**
 * Get all bundles for a specific account
 * @param state - RootState
 * @param accountEmail - Account email
 * @returns AccountBundles if found, empty object otherwise
 */
export const selectBundlesByAccount = (
  state: RootState,
  accountEmail: string | undefined
): AccountBundles => {
  if (!accountEmail) {
    return {};
  }

  const accountKey = accountEmail.toLowerCase();
  return state.bundle?.byAccount?.[accountKey] ?? {};
};

/**
 * Check if a txHash has an associated bundle_uuid for the given account
 * @param state - RootState
 * @param accountEmail - Account email
 * @param txHash - Transaction hash (will be lowercased)
 * @returns true if bundle exists, false otherwise
 */
export const selectHasBundle = (
  state: RootState,
  accountEmail: string | undefined,
  txHash: string | undefined
): boolean => {
  return selectBundleByTxHash(state, accountEmail, txHash) !== undefined;
};
