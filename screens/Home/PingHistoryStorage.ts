import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'ping_history_user';
const HISTORY_PREFIX = 'ping_history_';
const MAX_HISTORY = 5;

export type PingHistoryItem = {
  email: string;
  amount: string;
  time: string;
  status: 'claimed' | 'pending';
};

export const PingHistoryStorage = {
  /** Load history for the currently logged-in user */
  async load(): Promise<PingHistoryItem[]> {
    try {
      const currentUser = await AsyncStorage.getItem(USER_KEY);
      if (!currentUser) return [];

      const json = await AsyncStorage.getItem(`${HISTORY_PREFIX}${currentUser}`);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error('❌ Failed to load ping history:', e);
      return [];
    }
  },

  /** Save new history item for the current user */
  async save(currentUserEmail: string, newItem: PingHistoryItem): Promise<void> {
    try {
      // 🧩 Set current user
      await AsyncStorage.setItem(USER_KEY, currentUserEmail);

      // Load existing history for this user
      const key = `${HISTORY_PREFIX}${currentUserEmail}`;
      const existingJson = await AsyncStorage.getItem(key);
      const existing = existingJson ? JSON.parse(existingJson) : [];

      // Build updated list
      const updated = [newItem, ...existing].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      console.log(`✅ Saved ping history for ${currentUserEmail}:`, newItem);
    } catch (e) {
      console.error('❌ Failed to save ping history:', e);
    }
  },

  /** Clear all stored histories (optional, for logout cleanup) */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter((k) => k.startsWith(HISTORY_PREFIX) || k === USER_KEY);
      await AsyncStorage.multiRemove(userKeys);
      console.log('🧹 Cleared all ping histories.');
    } catch (e) {
      console.error('❌ Failed to clear all ping histories:', e);
    }
  },

  /** Clear only current user's history */
  async clearCurrent(): Promise<void> {
    try {
      const currentUser = await AsyncStorage.getItem(USER_KEY);
      if (currentUser) {
        await AsyncStorage.removeItem(`${HISTORY_PREFIX}${currentUser}`);
        console.log(`🧹 Cleared ping history for ${currentUser}.`);
      }
    } catch (e) {
      console.error('❌ Failed to clear current user history:', e);
    }
  },

  /** Get current active user email */
  async getSavedUser(): Promise<string | null> {
    return AsyncStorage.getItem(USER_KEY);
  },
};
