import { configureStore } from '@reduxjs/toolkit';
import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import historyReducer from './historySlice';
import balanceReducer from './balanceSlice';
import overlayReducer from './overlaySlice';
import eventReducer from './eventSlice';
import { saveStoreState, loadStoreState } from './storage';

/**
 * Create Redux store with persisted state
 * Following Redux persist pattern: load state BEFORE creating store
 */
export async function createStore() {
  // Load persisted state from AsyncStorage BEFORE creating store
  const persistedState = await loadStoreState();

  // Create store with preloadedState (proper Redux pattern)
  const store = configureStore({
    reducer: {
      history: historyReducer,
      balance: balanceReducer,
      overlay: overlayReducer,
      event: eventReducer,
    },
    preloadedState: persistedState
      ? ({
          history: persistedState.history,
          balance: persistedState.balance,
          // Don't persist overlay and event state (reset on app restart)
        } as Partial<{ history: any; balance: any }>)
      : undefined,
  });

  // Subscribe to save state changes to AsyncStorage
  // Using debounce pattern to avoid excessive writes
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  store.subscribe(() => {
    // Debounce saves to avoid excessive AsyncStorage writes
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const state = store.getState();
      void saveStoreState(state);
    }, 100); // Wait 100ms after last change before saving
  });

  return store;
}

// Create store instance (will be initialized async)
let storeInstance: ReturnType<typeof configureStore> | null = null;
const storePromise = createStore().then((store) => {
  storeInstance = store;
  return store;
});

/**
 * Get the Redux store instance
 * Returns a promise that resolves when store is ready
 */
export async function getStore() {
  return storeInstance || storePromise;
}

// Export store for synchronous access (use with caution)
// Will throw if accessed before store is initialized
export const store = new Proxy({} as Awaited<ReturnType<typeof createStore>>, {
  get(_target, prop) {
    if (!storeInstance) {
      throw new Error('Store not initialized yet. Use getStore() or await store initialization.');
    }
    return (storeInstance as any)[prop];
  },
});

// Initialize store immediately
void storePromise;

// Define the store type structure
const reducer = {
  history: historyReducer,
  balance: balanceReducer,
  overlay: overlayReducer,
  event: eventReducer,
};

// Export types - define directly from reducer structure
export type RootState = {
  history: ReturnType<typeof historyReducer>;
  balance: ReturnType<typeof balanceReducer>;
  overlay: ReturnType<typeof overlayReducer>;
  event: ReturnType<typeof eventReducer>;
};
export type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;
