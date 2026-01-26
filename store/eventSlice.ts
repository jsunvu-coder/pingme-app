import { createSlice } from '@reduxjs/toolkit';

export interface EventState {
  hongBaoPopupShownInSession: boolean; // Track if popup was shown in current session
}

const initialState: EventState = {
  hongBaoPopupShownInSession: false,
};

const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    markHongBaoPopupShown: (state) => {
      state.hongBaoPopupShownInSession = true;
    },
    resetHongBaoPopupShown: (state) => {
      state.hongBaoPopupShownInSession = false;
    },
  },
  selectors: {
    selectShouldShowHongBaoPopup: (state) => {
      return !state.hongBaoPopupShownInSession;
    },
  },
});

export const { markHongBaoPopupShown, resetHongBaoPopupShown } = eventSlice.actions;
export const { selectShouldShowHongBaoPopup } = eventSlice.selectors;
export default eventSlice.reducer;
