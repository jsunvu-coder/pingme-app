// utils/EncryptSession.ts

import { GLOBALS } from "./Constants";

const DEFAULT_SESSION: Record<string, any> = {
  GLOBALS: {
    GLOBAL_SALT: "0x60a4a6e8499db0df0d8fc1104e2be7de0aec2479a7866735bfe08bbb6aeae9b3",
    MIN_AMOUNT: 1000000,
    MIN_DURATION: 60,
    tokens: ["0x78Cf24370174180738C5B8E352B6D14c83a6c9A9"],
  }
};

export class EncryptSession {
  private static memoryStore: Record<string, any> = { ...DEFAULT_SESSION };

  /** Save session object synchronously to memory */
  static setSessionObject(key: string, value: any): void {
    try {
      EncryptSession.memoryStore[key] = value;
    } catch (e) {
      console.error("[EncryptSession] setSessionObject error:", e);
    }
  }

  /** Load session object synchronously from memory */
  static getSessionObject(key: string): any {
    try {
      const value = EncryptSession.memoryStore[key];
      return value ?? null;
    } catch (e) {
      console.error("[EncryptSession] getSessionObject error:", e);
      return null;
    }
  }

  /** Clear one session object */
  static clearSessionObject(key: string): void {
    try {
      delete EncryptSession.memoryStore[key];
    } catch (e) {
      console.error("[EncryptSession] clearSessionObject error:", e);
    }
  }

  /** Clear all in-memory sessions (reset back to defaults) */
  static clearAll(): void {
    EncryptSession.memoryStore = { ...DEFAULT_SESSION };
  }

  /** Reset explicitly to defaults */
  static resetDefaults(): void {
    EncryptSession.memoryStore = { ...DEFAULT_SESSION };
  }
}
