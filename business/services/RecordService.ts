// services/RecordService.ts
import { ContractService } from './ContractService';
import { RecordEntry } from 'business/Types';
import { PAGINATION, UPDATE_DELAY } from '../Config';

type RecordListener = (records: RecordEntry[]) => void;

export class RecordService {
  private static instance: RecordService;

  private records: RecordEntry[] = [];
  private currentCommitment: string | null = null;
  private contractService: ContractService;
  private recordListeners: RecordListener[] = [];
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  private updatePromise: Promise<void> | null = null;

  private constructor() {
    this.contractService = ContractService.getInstance();
  }

  static getInstance(): RecordService {
    if (!RecordService.instance) {
      RecordService.instance = new RecordService();
    }
    return RecordService.instance;
  }

  /** Get current records in memory */
  getRecords(): RecordEntry[] {
    return this.records;
  }

  getCommitment(): string | null {
    return this.currentCommitment;
  }

  onRecordChange(listener: RecordListener): void {
    this.recordListeners.push(listener);
  }

  offRecordChange(listener: RecordListener): void {
    this.recordListeners = this.recordListeners.filter((fn) => fn !== listener);
  }

  private notifyRecordChange(): void {
    this.recordListeners.forEach((fn) => fn(this.records));
  }

  /** Fetch full history with pagination */
  async getRecord(): Promise<RecordEntry[]> {
    try {
      const cr = this.contractService.getCrypto();
      const commitment = cr?.commitment?.toLowerCase();
      if (!commitment) return this.records;

      if (commitment !== this.currentCommitment) {
        // New account/session → reset cache to avoid mixing histories
        this.records = [];
        this.currentCommitment = commitment;
        this.notifyRecordChange();
      }

      // Stream updates as pages arrive (aligns with web expand() behavior).
      const streamed: RecordEntry[] = [];
      let nextCommitment: string | undefined = commitment;
      let guard = 0;

      while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
        const ret = await this.contractService.getEvents(nextCommitment, PAGINATION);
        streamed.push(...(ret.events ?? []));
        this.records = streamed;
        this.notifyRecordChange();
        nextCommitment = ret.commitment;
        if (!ret.events || ret.events.length === 0) break; // stop if nothing returned
        // Small delay between pages to avoid hammering the API and to keep UI responsive.
        await new Promise((r) => setTimeout(r, 100));
        if (++guard > 400) break; // safety to avoid infinite loop
      }

      this.records = streamed;
      this.notifyRecordChange();
      return this.records;
    } catch (err) {
      console.error('[RecordService] Failed to fetch records:', err);
      return this.records;
    }
  }

  /** Fetch only the first page of history */
  async getFirstPage(): Promise<RecordEntry[]> {
    try {
      const cr = this.contractService.getCrypto();
      const commitment = cr?.commitment?.toLowerCase();
      if (!commitment) return this.records;

      if (commitment !== this.currentCommitment) {
        this.records = [];
        this.currentCommitment = commitment;
        this.notifyRecordChange();
      }

      const ret = await this.contractService.getEvents(commitment, PAGINATION);
      const firstPage = ret.events ?? [];
      this.records = firstPage;
      this.notifyRecordChange();
      return this.records;
    } catch (err) {
      console.error('[RecordService] Failed to fetch first page of records:', err);
      return this.records;
    }
  }

  /** Fetch only latest records and prepend */
  async _updateRecord(): Promise<void> {
    try {
      const cr = this.contractService.getCrypto();
      const commitment = cr?.commitment?.toLowerCase();
      if (!commitment) return;

      if (commitment !== this.currentCommitment) {
        this.records = [];
        this.currentCommitment = commitment;
        this.notifyRecordChange();
      }

      const existingTopHash = this.records[0]?.txHash;
      // Mirror web logic: fetch only a tiny latest window and prepend non-overlapping items.
      const ret = await this.contractService.getEvents(commitment, 2);
      let events = (ret?.events ?? []) as RecordEntry[];

      if (this.records.length > 0 && existingTopHash) {
        const idx = events.findIndex((e: any) => e.txHash === existingTopHash);
        if (idx >= 0) {
          events = events.slice(0, idx);
        }
      }

      if (events.length > 0) {
        this.records = [...events, ...this.records];
        this.notifyRecordChange();
      }
    } catch (err) {
      console.error('[RecordService] Failed to update records:', err);
    }
  }

  /**
   * Schedule an update after a delay (default matches web UPDATE_DELAY).
   * Returns a Promise that resolves after the update executes (so callers can `await` it).
   */
  updateRecord(delayMs: number = UPDATE_DELAY): Promise<void> {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    this.updatePromise = new Promise<void>((resolve) => {
      this.updateTimer = setTimeout(async () => {
        try {
          await this._updateRecord();
        } finally {
          this.updateTimer = null;
          resolve();
        }
      }, delayMs);
    });

    return this.updatePromise;
  }

  /** Immediate update helper */
  async updateRecordNow(): Promise<void> {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    await this._updateRecord();
  }

  /** Clear memory */
  clear(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.records = [];
    this.currentCommitment = null;
    this.notifyRecordChange();
  }
}
