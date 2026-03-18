import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ContractService } from 'business/services/ContractService';
import { AccountDataService } from 'business/services/AccountDataService';

type LeaderboardType = 'referrals' | 'interactions' | 'pings';

export interface StatsResponse {
  interactions: number;
  pings: number;
  referrals: {
    count: number;
    second: number;
  };
}

export interface LeaderboardEntry {
  // Common fields
  count: number;
  is_self: boolean;
  // Email of the account (for UI display)
  email?: string;
  // For referrals leaderboard
  first?: number;
  second?: number;
}

export interface LeadersResponse {
  interactions: LeaderboardEntry[];
  pings: LeaderboardEntry[];
  referrals: LeaderboardEntry[];
}

export interface AccountLeaderboardState {
  stats: StatsResponse | null;
  leaders: LeadersResponse | null;
  loading: boolean;
  error: string | null;
}

export interface LeaderboardState {
  // Store leaderboard per account using email/username as key
  byAccount: Record<string, AccountLeaderboardState>;
}

const initialState: LeaderboardState = {
  byAccount: {},
};

export const fetchLeaderboardData = createAsyncThunk(
  'leaderboard/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const accountEmail = AccountDataService.getInstance().email;
      if (!accountEmail) {
        throw new Error('Missing account email');
      }

      const contractService = ContractService.getInstance();
      const crypto = contractService.getCrypto();

      if (!crypto?.commitment) {
        throw new Error('Missing commitment');
      }

      const commitment: string = crypto.commitment;

      const [stats, leaders] = await Promise.all([
        contractService.getStats(commitment),
        contractService.getLeaders(commitment),
      ]);
      return {
        accountEmail,
        stats,
        leaders,
      } as {
        accountEmail: string;
        stats: StatsResponse;
        leaders: LeadersResponse;
      };
    } catch (error: any) {
      return rejectWithValue(error?.message ?? 'Failed to load leaderboard');
    }
  }
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboardData.pending, (state) => {
        const accountEmail = AccountDataService.getInstance().email;
        if (!accountEmail) {
          return;
        }
        const accountKey = accountEmail.toLowerCase();
        if (!state.byAccount[accountKey]) {
          state.byAccount[accountKey] = {
            stats: null,
            leaders: null,
            loading: false,
            error: null,
          };
        }
        state.byAccount[accountKey].loading = true;
        state.byAccount[accountKey].error = null;
      })
      .addCase(fetchLeaderboardData.fulfilled, (state, action) => {
        const accountKey = action.payload.accountEmail.toLowerCase();
        if (!state.byAccount[accountKey]) {
          state.byAccount[accountKey] = {
            stats: null,
            leaders: null,
            loading: false,
            error: null,
          };
        }
        state.byAccount[accountKey].loading = false;
        state.byAccount[accountKey].stats = action.payload.stats;
        state.byAccount[accountKey].leaders = action.payload.leaders;
      })
      .addCase(fetchLeaderboardData.rejected, (state, action) => {
        const accountEmail = AccountDataService.getInstance().email;
        if (!accountEmail) {
          return;
        }
        const accountKey = accountEmail.toLowerCase();
        if (!state.byAccount[accountKey]) {
          state.byAccount[accountKey] = {
            stats: null,
            leaders: null,
            loading: false,
            error: null,
          };
        }
        state.byAccount[accountKey].loading = false;
        state.byAccount[accountKey].error =
          (action.payload as string) ?? action.error.message ?? null;
      });
  },
});

export default leaderboardSlice.reducer;

