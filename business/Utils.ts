import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard"; // or use react-native-clipboard/clipboard
import { BalanceEntry, RecordEntry } from "./Types";
import { MIN_PASSWORD_LENGTH } from "./Config";
import { EncryptSession } from "./EncryptSession";
import { GLOBALS } from "./Constants";

export class Utils {
  static readonly MICRO_FACTOR = 1_000_000n;

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
    const cleaned = (amount ?? "").toString().trim();
    if (!cleaned) return 0n;

    const sanitized = cleaned.replace(/[^0-9.\-]/g, "");
    if (!sanitized || sanitized === "-" || sanitized === "." || sanitized === "-.") return 0n;

    const sign = sanitized.startsWith("-") ? -1n : 1n;
    const unsigned = sanitized.replace(/^\-/, "");
    const firstDot = unsigned.indexOf(".");
    const wholeStr = (firstDot >= 0 ? unsigned.slice(0, firstDot) : unsigned) || "0";
    const fracRaw = firstDot >= 0 ? unsigned.slice(firstDot + 1) : "";

    const wholeDigits = wholeStr.replace(/\D/g, "") || "0";
    const fracDigits = fracRaw.replace(/\D/g, "");

    const whole = BigInt(wholeDigits) * Utils.MICRO_FACTOR;

    if (!fracDigits) return sign * whole;

    const fracLen = fracDigits.length;
    const frac6 = fracLen <= 6 ? fracDigits.padEnd(6, "0") : fracDigits.slice(0, 6);
    let micro = whole + BigInt(frac6);

    if (fracLen > 6) {
      const roundDigit = fracDigits.charCodeAt(6) - 48;
      if (roundDigit >= 5) micro += 1n;
    }

    return sign * micro;
  }

  static formatMicroToUsd(
    value: string | bigint | null | undefined,
    mode: "dollar" | "cent" | undefined = undefined,
    options?: { grouping?: boolean; empty?: string }
  ): string {
    const empty = options?.empty ?? "0.00";
    try {
      if (value === null || value === undefined) return empty;
      const micro = typeof value === "bigint" ? value : BigInt(value);

      const sign = micro < 0n ? "-" : "";
      const absMicro = micro < 0n ? -micro : micro;

      // Round to cents: 0.01 USD = 10,000 micro.
      const cents = (absMicro + 5_000n) / 10_000n;
      const dollars = cents / 100n;
      const centPart = (cents % 100n).toString().padStart(2, "0");

      const dollarsStr = options?.grouping === false
        ? dollars.toString()
        : Utils.groupDigits(dollars.toString());

      if (mode === "dollar") return `${sign}${dollarsStr}`;
      if (mode === "cent") return centPart;
      return `${sign}${dollarsStr}.${centPart}`;
    } catch {
      return empty;
    }
  }

  private static groupDigits(value: string): string {
    const digits = value.replace(/^0+(?=\d)/, "") || "0";
    let out = "";
    for (let i = 0; i < digits.length; i++) {
      const idxFromEnd = digits.length - i;
      out += digits[i];
      if (idxFromEnd > 1 && idxFromEnd % 3 === 1) out += ",";
    }
    return out;
  }
}
