import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  /**
   * Spec (Sign In step 2): the app is "heavily disabled" when messaging keys
   * (PRIVATE_KEY + ENC_KEY_REF) are missing for the active email. Only
   * balance / refresh / withdraw / generate-new-key / logout remain functional.
   *
   * null = unknown (pre-login / not yet checked) — treat as disabled.
   * false = confirmed missing — disabled.
   * true = confirmed present — fully functional.
   */
  messagingKeysAvailable: boolean | null;
}

const initialState: AuthState = {
  messagingKeysAvailable: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setMessagingKeysAvailable: (state, action: PayloadAction<boolean>) => {
      state.messagingKeysAvailable = action.payload;
    },
    resetMessagingKeysAvailable: (state) => {
      state.messagingKeysAvailable = null;
    },
  },
  selectors: {
    /** True only when keys are confirmed present. Default for gating UI. */
    selectAppFullyFunctional: (state) => state.messagingKeysAvailable === true,
    selectMessagingKeysAvailable: (state) => state.messagingKeysAvailable,
  },
});

export const { setMessagingKeysAvailable, resetMessagingKeysAvailable } = authSlice.actions;
export const { selectAppFullyFunctional, selectMessagingKeysAvailable } = authSlice.selectors;
export default authSlice.reducer;
