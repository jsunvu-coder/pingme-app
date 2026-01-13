import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface AccountBalance {
  stablecoinBalance: string; // Total stablecoin balance (e.g., "1234.56")
  lastUpdated: number | null;
}

export interface BalanceState {
  // Store balance per account using email/username as key
  byAccount: Record<string, AccountBalance>;
}

const initialState: BalanceState = {
  byAccount: {},
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    setStablecoinBalance(
      state: BalanceState,
      action: PayloadAction<{
        accountEmail: string;
        stablecoinBalance: string;
      }>
    ) {
      const accountKey = action.payload.accountEmail.toLowerCase();
      if (!state.byAccount[accountKey]) {
        state.byAccount[accountKey] = {
          stablecoinBalance: '0.00',
          lastUpdated: null,
        };
      }

      const accountBalance = state.byAccount[accountKey];
      accountBalance.stablecoinBalance = action.payload.stablecoinBalance;
      accountBalance.lastUpdated = Date.now();
    },
    clearBalance(state: BalanceState, action: PayloadAction<{ accountEmail?: string }>) {
      if (action.payload.accountEmail) {
        // Clear balance for specific account
        const accountKey = action.payload.accountEmail.toLowerCase();
        delete state.byAccount[accountKey];
      } else {
        // Clear all balances
        state.byAccount = {};
      }
    },
  },
});

export const { setStablecoinBalance, clearBalance } = balanceSlice.actions;
export default balanceSlice.reducer;
