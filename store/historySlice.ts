import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { TransactionViewModel } from 'screens/Home/History/List/TransactionViewModel';

export interface AccountHistory {
  items: TransactionViewModel[];
  nextCommitment: string | null; // Next commitment for pagination
  hasMore: boolean; // Whether there are more items to load
  lastUpdated: number | null;
}

export interface HistoryState {
  // Store history per account using email/username as key
  byAccount: Record<string, AccountHistory>;
}

const initialState: HistoryState = {
  byAccount: {},
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setTransactions(
      state: HistoryState,
      action: PayloadAction<{
        accountEmail: string;
        items: TransactionViewModel[];
        nextCommitment?: string | null;
      }>
    ) {
      const accountKey = action.payload.accountEmail.toLowerCase();
      if (!state.byAccount[accountKey]) {
        state.byAccount[accountKey] = {
          items: [],
          nextCommitment: null,
          hasMore: true,
          lastUpdated: null,
        };
      }

      const accountHistory = state.byAccount[accountKey];
      accountHistory.items = action.payload.items;
      accountHistory.nextCommitment = action.payload.nextCommitment ?? null;
      accountHistory.hasMore =
        !!action.payload.nextCommitment && !/^0x0+$/.test(action.payload.nextCommitment);
      accountHistory.lastUpdated = Date.now();
    },
    addTransactions(
      state: HistoryState,
      action: PayloadAction<{
        accountEmail: string;
        items: TransactionViewModel[];
        nextCommitment?: string | null;
      }>
    ) {
      const accountKey = action.payload.accountEmail.toLowerCase();
      if (!state.byAccount[accountKey]) {
        state.byAccount[accountKey] = {
          items: [],
          nextCommitment: null,
          hasMore: true,
          lastUpdated: null,
        };
      }

      const accountHistory = state.byAccount[accountKey];

      // Merge new transactions with existing ones, avoiding duplicates by txHash
      const existingTxHashes = new Set(
        accountHistory.items.map((item) => item.txHash.toLowerCase())
      );
      const newItems = action.payload.items.filter(
        (item) => !existingTxHashes.has(item.txHash.toLowerCase())
      );

      if (newItems.length > 0) {
        // Merge and sort by timestamp (newest first)
        const merged = [...accountHistory.items, ...newItems].sort(
          (a, b) => b.timestamp - a.timestamp
        );
        accountHistory.items = merged;
      }

      // Update nextCommitment and hasMore
      accountHistory.nextCommitment = action.payload.nextCommitment ?? null;
      accountHistory.hasMore =
        !!action.payload.nextCommitment && !/^0x0+$/.test(action.payload.nextCommitment ?? '');
      accountHistory.lastUpdated = Date.now();
    },
    clearHistory(state: HistoryState, action: PayloadAction<{ accountEmail?: string }>) {
      if (action.payload.accountEmail) {
        // Clear history for specific account
        const accountKey = action.payload.accountEmail.toLowerCase();
        delete state.byAccount[accountKey];
      }
    },
  },
});

export const { setTransactions, addTransactions, clearHistory } = historySlice.actions;
export default historySlice.reducer;
