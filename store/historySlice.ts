import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { TransactionViewModel } from 'screens/Home/History/List/TransactionViewModel';

export interface HistoryState {
  items: TransactionViewModel[];
  nextCommitment: string | null; // Next commitment for pagination
  hasMore: boolean; // Whether there are more items to load
  lastUpdated: number | null;
}

const initialState: HistoryState = {
  items: [],
  nextCommitment: null,
  hasMore: true,
  lastUpdated: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setTransactions(
      state: HistoryState,
      action: PayloadAction<{ items: TransactionViewModel[]; nextCommitment?: string | null }>
    ) {
      state.items = action.payload.items;
      state.nextCommitment = action.payload.nextCommitment ?? null;
      state.hasMore =
        !!action.payload.nextCommitment && !/^0x0+$/.test(action.payload.nextCommitment);
      state.lastUpdated = Date.now();
    },
    addTransactions(
      state: HistoryState,
      action: PayloadAction<{ items: TransactionViewModel[]; nextCommitment?: string | null }>
    ) {
      // Merge new transactions with existing ones, avoiding duplicates by txHash
      const existingTxHashes = new Set(state.items.map((item) => item.txHash.toLowerCase()));
      const newItems = action.payload.items.filter(
        (item) => !existingTxHashes.has(item.txHash.toLowerCase())
      );

      if (newItems.length > 0) {
        // Merge and sort by timestamp (newest first)
        const merged = [...state.items, ...newItems].sort((a, b) => b.timestamp - a.timestamp);
        state.items = merged;
      }

      // Update nextCommitment and hasMore
      state.nextCommitment = action.payload.nextCommitment ?? null;
      state.hasMore =
        !!action.payload.nextCommitment && !/^0x0+$/.test(action.payload.nextCommitment ?? '');
      state.lastUpdated = Date.now();
    },
    clearHistory(state: HistoryState) {
      state.items = [];
      state.nextCommitment = null;
      state.hasMore = true;
      state.lastUpdated = null;
    },
  },
});

export const { setTransactions, addTransactions, clearHistory } = historySlice.actions;
export default historySlice.reducer;
