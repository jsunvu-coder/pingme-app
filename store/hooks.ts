import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { AccountDataService } from 'business/services/AccountDataService';
import { AccountHistory } from './historySlice';
import { useMemo } from 'react';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const DEFAULT_HISTORY: AccountHistory = {
  items: [],
  nextCommitment: null,
  hasMore: true,
  lastUpdated: null,
};

/**
 * Hook to get current account history
 * Gets the email from AccountDataService and returns the corresponding history
 */
export function useCurrentAccountHistory(): AccountHistory {
  const accountHistory = useAppSelector((state) => {
    // Check if state.history exists
    if (!state?.history) {
      return DEFAULT_HISTORY;
    }

    // Check if byAccount exists and is an object
    if (!state.history.byAccount || typeof state.history.byAccount !== 'object') {
      return DEFAULT_HISTORY;
    }

    const accountEmail = AccountDataService.getInstance().email;
    if (!accountEmail) {
      return DEFAULT_HISTORY;
    }

    const accountKey = accountEmail.toLowerCase();
    const history = state.history.byAccount[accountKey];

    // If history exists for this account, return it; otherwise return default
    return history ?? DEFAULT_HISTORY;
  });

  return accountHistory;
}
