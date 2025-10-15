import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard"; // or use react-native-clipboard/clipboard
import { BalanceEntry, RecordEntry } from "./Types";
import { MIN_PASSWORD_LENGTH } from "./Config";
import { EncryptSession } from "./EncryptSession";
import { GLOBALS } from "./Constants";

export class Utils {
  // ------------------------
  // AsyncStorage replacements
  // ------------------------
  static getSessionObject(key: string): any {
    return EncryptSession.getSessionObject(GLOBALS);
  }

  static async setSessionObject(key: string, obj: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.error("setSessionObject error:", e);
    }
  }

  static async getSessionString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error("getSessionString error:", e);
      return null;
    }
  }

  static async setSessionString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error("setSessionString error:", e);
    }
  }

  static async getSessionNumber(key: string): Promise<number> {
    try {
      const n = await AsyncStorage.getItem(key);
      return n ? parseInt(n, 10) : 0;
    } catch (e) {
      console.error("getSessionNumber error:", e);
      return 0;
    }
  }

  static async setSessionNumber(key: string, value: number): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (e) {
      console.error("setSessionNumber error:", e);
    }
  }

  static async clearSession(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("clearSession error:", e);
    }
  }

  // ------------------------
  // Clipboard
  // ------------------------
  static async copyToClipboard(txt: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(txt);
    } catch (e) {
      console.error("copyToClipboard error:", e);
    }
  }

  // ------------------------
  // Balance & Records filtering
  // ------------------------
  static filterBalance(bal: BalanceEntry[]): BalanceEntry[] {
    return bal
      .sort((a, b) => {
        const bigA = BigInt(a.amount);
        const bigB = BigInt(b.amount);
        return bigB > bigA ? 1 : bigB < bigA ? -1 : 0;
      });
  }

  static filterPayRecords(
    rec: RecordEntry[]
  ): { sent: RecordEntry[]; claimed: Set<string>; reclaimed: Set<string> } {
    const sent: RecordEntry[] = [];
    const claimed = new Set<string>();
    const reclaimed = new Set<string>();

    for (let i = 0; i < rec.length; ++i) {
      const r = rec[i];
      if (r.action === 0 && r.fromCommitment) {
        claimed.add(r.lockboxCommitment);
      } else if (r.action === 5) {
        reclaimed.add(r.lockboxCommitment);
      } else if (r.action === 9) {
        sent.push(r);
      }
    }

    return { sent, claimed, reclaimed };
  }

  static filterTrxRecords(rec: RecordEntry[]): RecordEntry[] {
    const trx: RecordEntry[] = [];
    for (let i = 0; i < rec.length; ++i) {
      const r = rec[i];
      if ((r.action === 0 && r.toCommitment) || r.action >= 2) {
        trx.push(r);
      }
    }
    return trx;
  }

  // ------------------------
  // Validation
  // ------------------------
  static validateCredential(
    username: string,
    password: string,
    confirmPassword: string
  ): string[] {
    const err: string[] = [];
    if (!Utils.isValidEmail(username)) {
      err.push("INVALID_EMAIL");
    }
    if (password !== confirmPassword) {
      err.push("PASSWORDS_MISMATCH");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      err.push("PASSWORD_TOO_SHORT");
    }
    return err;
  }

  static isValidEmail(email: string) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // ------------------------
  // Currency & Numbers
  // ------------------------
  static toCurrency(value: any): string {
    const numeric = parseFloat(value?.toString().replace(/[^0-9.]/g, ""));
    if (isNaN(numeric)) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  static toMicro(amount: string): bigint {
    return BigInt(
      Math.round(parseFloat(amount.replace(/[^0-9.]/g, "")) * 1_000_000)
    );
  }
}
