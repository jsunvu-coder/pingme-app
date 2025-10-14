import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "recent_emails";

export const RecentEmailStorage = {
  /**
   * Load the most recent email list from local storage.
   */
  async load(): Promise<string[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error("❌ Failed to load recent emails:", e);
      return [];
    }
  },

  /**
   * Save a new email address to the top of the list.
   * - Removes duplicates
   * - Keeps maximum 10 entries
   */
  async save(newEmail: string): Promise<void> {
    try {
      const existing = await this.load();
      const cleaned = existing.filter(
        (email) => email.toLowerCase() !== newEmail.toLowerCase()
      );

      const updated = [newEmail, ...cleaned].slice(0, 10);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      console.log("✅ Saved recent email:", newEmail);
    } catch (e) {
      console.error("❌ Failed to save email:", e);
    }
  },

  /**
   * Clear all recent emails from storage.
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("🧹 Cleared all recent emails.");
    } catch (e) {
      console.error("❌ Failed to clear recent emails:", e);
    }
  },
};
