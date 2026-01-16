import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { AccountDataService } from 'business/services/AccountDataService';
import { AccountHistory } from './historySlice';
import { AccountBalance } from './balanceSlice';
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

const DEFAULT_BALANCE: AccountBalance = {
  stablecoinBalance: '0.00',
  stablecoinEntries: [],
  lastUpdated: null,
};

/**
 * Hook to get current account stablecoin balance
 * Gets the email from AccountDataService and returns the corresponding balance
 */
export function useCurrentAccountStablecoinBalance(): AccountBalance {
  const accountBalance = useAppSelector((state) => {
    // Check if state.balance exists
    if (!state?.balance) {
      return DEFAULT_BALANCE;
    }

    // Check if byAccount exists and is an object
    if (!state.balance.byAccount || typeof state.balance.byAccount !== 'object') {
      return DEFAULT_BALANCE;
    }

    const accountEmail = AccountDataService.getInstance().email;
    if (!accountEmail) {
      return DEFAULT_BALANCE;
    }

    const accountKey = accountEmail.toLowerCase();
    const balance = state.balance.byAccount[accountKey];

    // If balance exists for this account, return it; otherwise return default
    return balance ?? DEFAULT_BALANCE;
  });

  return accountBalance;
}
