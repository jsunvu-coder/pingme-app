import AsyncStorage from '@react-native-async-storage/async-storage';

// Single key for entire Redux store state
const STORE_KEY = '@pingme_store_v1';

/**
 * AsyncStorage adapter for Redux persist pattern
 * Similar to redux-persist's storage interface
 */
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      console.warn(`[AsyncStorage] Failed to get item: ${key}`, err);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[AsyncStorage] Failed to set item: ${key}`, err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[AsyncStorage] Failed to remove item: ${key}`, err);
    }
  },
};

/**
 * Load entire Redux store state from AsyncStorage
 * This should be called BEFORE creating the store to use as preloadedState
 * Includes migration logic to handle old state structures
 */
export async function loadStoreState(): Promise<Record<string, any> | undefined> {
  try {
    const raw = await storage.getItem(STORE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, any>;

    // Migrate old state structure to new structure
    if (parsed.history) {
      // If history exists but doesn't have byAccount, migrate it
      if (!parsed.history.byAccount || typeof parsed.history.byAccount !== 'object') {
        // Old structure: history has items directly
        // New structure: history.byAccount[email] = { items, ... }
        // For old state, we'll just reset to empty byAccount
        parsed.history = {
          byAccount: {},
        };
      }
    }

    // Ensure balance slice has correct structure
    if (parsed.balance) {
      if (!parsed.balance.byAccount || typeof parsed.balance.byAccount !== 'object') {
        parsed.balance = {
          byAccount: {},
        };
      } else {
        // Migrate old balance entries to include stablecoinEntries
        const byAccount = parsed.balance.byAccount;
        for (const accountKey in byAccount) {
          if (byAccount[accountKey] && !Array.isArray(byAccount[accountKey].stablecoinEntries)) {
            byAccount[accountKey].stablecoinEntries = [];
          }
        }
      }
    }

    // Ensure bundle slice has correct structure
    if (parsed.bundle) {
      if (!parsed.bundle.byAccount || typeof parsed.bundle.byAccount !== 'object') {
        parsed.bundle = {
          byAccount: {},
        };
      }
    }

    return parsed;
  } catch (err) {
    console.warn('[AsyncStorage] Failed to load store state', err);
    return undefined;
  }
}

/**
 * Save entire Redux store state to AsyncStorage
 * Called automatically via store subscription
 */
export async function saveStoreState(state: Record<string, any>): Promise<void> {
  try {
    await storage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[AsyncStorage] Failed to save store state', err);
  }
}

/**
 * Clear persisted store state
 */
export async function clearStoreState(): Promise<void> {
  try {
    await storage.removeItem(STORE_KEY);
  } catch (err) {
    console.warn('[AsyncStorage] Failed to clear store state', err);
  }
}
