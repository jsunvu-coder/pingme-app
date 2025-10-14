// storage/PingHistoryStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ping_history";
const MAX_HISTORY = 10; // or 5 if you want short history

export type PingHistoryItem = {
  email: string;
  amount: string;
  time: string;
  status: "claimed" | "pending";
};

export const PingHistoryStorage = {
  async load(): Promise<PingHistoryItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error("❌ Failed to load ping history:", e);
      return [];
    }
  },

  async save(newItem: PingHistoryItem): Promise<void> {
    try {
      const existing = await this.load();
      const updated = [newItem, ...existing].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log("✅ Saved ping transaction:", newItem);
    } catch (e) {
      console.error("❌ Failed to save ping history:", e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("🧹 Cleared ping history.");
    } catch (e) {
      console.error("❌ Failed to clear ping history:", e);
    }
  },
};
