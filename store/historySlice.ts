import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { TransactionViewModel } from 'screens/Home/History/List/TransactionViewModel';

export interface HistoryState {
  items: TransactionViewModel[];
  lastUpdated: number | null;
}

const initialState: HistoryState = {
  items: [],
  lastUpdated: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setTransactions(state: HistoryState, action: PayloadAction<TransactionViewModel[]>) {
      state.items = action.payload;
      state.lastUpdated = Date.now();
    },
    clearHistory(state: HistoryState) {
      state.items = [];
      state.lastUpdated = null;
    },
  },
});

export const { setTransactions, clearHistory } = historySlice.actions;
export default historySlice.reducer;
