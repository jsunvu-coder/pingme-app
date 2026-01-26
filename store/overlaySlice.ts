import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type OverlayType = 'hongbao-success' | 'prevent-touch-main-tab' | null;

export interface OverlayPayload {
  [key: string]: any;
}

export interface OverlayState {
  isVisible: boolean;
  type: OverlayType;
  payload: OverlayPayload | null;
  actionTriggered: string | null; // New: for triggering actions outside overlay
}

const initialState: OverlayState = {
  isVisible: false,
  type: null,
  payload: null,
  actionTriggered: null,
};

const overlaySlice = createSlice({
  name: 'overlay',
  initialState,
  reducers: {
    showOverlay: (
      state,
      action: PayloadAction<{ type: OverlayType; payload?: OverlayPayload }>
    ) => {
      state.isVisible = true;
      state.type = action.payload.type;
      state.payload = action.payload.payload || null;
    },
    hideOverlay: (state) => {
      state.isVisible = false;
      state.type = null;
      state.payload = null;
    },
    updateOverlayPayload: (state, action: PayloadAction<OverlayPayload>) => {
      state.payload = { ...state.payload, ...action.payload };
    },
    triggerAction: (state, action: PayloadAction<string>) => {
      state.actionTriggered = action.payload;
    },
    clearAction: (state) => {
      state.actionTriggered = null;
    },
  },
});

export const { showOverlay, hideOverlay, updateOverlayPayload, triggerAction, clearAction } =
  overlaySlice.actions;
export default overlaySlice.reducer;
