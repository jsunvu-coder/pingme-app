import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MainTabState {
  preventTouch: boolean; // Prevent touch on tab buttons
}

const initialState: MainTabState = {
  preventTouch: false,
};

const mainTabSlice = createSlice({
  name: 'mainTab',
  initialState,
  reducers: {
    setPreventTouch: (state, action: PayloadAction<boolean>) => {
      state.preventTouch = action.payload;
    },
  },
});

export const { setPreventTouch } = mainTabSlice.actions;
export default mainTabSlice.reducer;
