import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { BalanceEntry } from 'business/Types';

export interface AccountBalance {
  stablecoinBalance: string; // Total stablecoin balance (e.g., "1234.56")
  stablecoinEntries: BalanceEntry[]; // Individual stablecoin entries (token, amount)
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
        stablecoinEntries: BalanceEntry[];
      }>
    ) {
      const accountKey = action.payload.accountEmail.toLowerCase();
      if (!state.byAccount[accountKey]) {
        state.byAccount[accountKey] = {
          stablecoinBalance: '0.00',
          stablecoinEntries: [],
          lastUpdated: null,
        };
      }

      const accountBalance = state.byAccount[accountKey];
      accountBalance.stablecoinBalance = action.payload.stablecoinBalance;
      // Sort stablecoinEntries by amount (descending)
      accountBalance.stablecoinEntries = [...action.payload.stablecoinEntries].sort((a, b) => {
        try {
          const amountA = BigInt(a.amount ?? '0');
          const amountB = BigInt(b.amount ?? '0');
          if (amountA > amountB) return -1;
          if (amountA < amountB) return 1;
          return 0;
        } catch {
          return 0;
        }
      });
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
