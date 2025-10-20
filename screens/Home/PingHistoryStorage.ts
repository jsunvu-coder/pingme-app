import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ping_history';
const USER_KEY = 'ping_history_user';
const MAX_HISTORY = 5;

export type PingHistoryItem = {
  email: string;
  amount: string;
  time: string;
  status: 'claimed' | 'pending';
};

export const PingHistoryStorage = {
  /** Load history for the currently saved user */
  async load(): Promise<PingHistoryItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error('❌ Failed to load ping history:', e);
      return [];
    }
  },

  /** Save new history item — auto-clears if a different user logs in */
  async save(currentUserEmail: string, newItem: PingHistoryItem): Promise<void> {
    try {
      const savedUser = await AsyncStorage.getItem(USER_KEY);

      // 🧹 If this is a different user → clear previous history
      if (savedUser && savedUser !== currentUserEmail) {
        console.log(
          `🔄 Detected user change (${savedUser} → ${currentUserEmail}), clearing history...`
        );
        await AsyncStorage.multiRemove([STORAGE_KEY, USER_KEY]);
      }

      // Set current user as the active history owner
      await AsyncStorage.setItem(USER_KEY, currentUserEmail);

      // Load current list (after potential clear)
      const existingJson = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = existingJson ? JSON.parse(existingJson) : [];

      // Build updated list
      const updated = [newItem, ...existing].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      console.log(`✅ Saved ping transaction for ${currentUserEmail}:`, newItem);
    } catch (e) {
      console.error('❌ Failed to save ping history:', e);
    }
  },

  /** Optional: manually clear everything */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, USER_KEY]);
      console.log('🧹 Cleared ping history.');
    } catch (e) {
      console.error('❌ Failed to clear ping history:', e);
    }
  },

  /** Helper: get the currently saved user */
  async getSavedUser(): Promise<string | null> {
    return AsyncStorage.getItem(USER_KEY);
  },
};
