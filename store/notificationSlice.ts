import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
  /** Number of (non-expired) encrypted messages currently in the inbox. */
  count: number;
}

const initialState: NotificationState = { count: 0 };

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotificationCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
    resetNotificationCount: (state) => {
      state.count = 0;
    },
  },
  selectors: {
    selectNotificationCount: (state) => state.count,
  },
});

export const { setNotificationCount, resetNotificationCount } = notificationSlice.actions;
export const { selectNotificationCount } = notificationSlice.selectors;
export default notificationSlice.reducer;
