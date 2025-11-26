// services/RecordService.ts
import { ContractService } from './ContractService';
import { RecordEntry } from 'business/Types';
import { PAGINATION } from '../Config';

export class RecordService {
  private static instance: RecordService;

  private records: RecordEntry[] = [];
  private currentCommitment: string | null = null;
  private contractService: ContractService;

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
      }

      const allRecords: RecordEntry[] = [];
      let nextCommitment: string | undefined = commitment;
      let guard = 0;

      while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
        const ret = await this.contractService.getEvents(nextCommitment, PAGINATION);
        allRecords.push(...ret.events);
        nextCommitment = ret.commitment;
        if (++guard > 200) break; // safety to avoid infinite loop
      }

      this.records = allRecords;
      return this.records;
    } catch (err) {
      console.error('[RecordService] Failed to fetch records:', err);
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
      }

      const existingTopHash = this.records[0]?.txHash;
      let nextCommitment: string | undefined = commitment;
      const newEvents: RecordEntry[] = [];
      let guard = 0;

      while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
        const ret = await this.contractService.getEvents(nextCommitment, PAGINATION);
        const batch = ret.events ?? [];

        // Stop once we reach a transaction we already have
        const overlapIdx = existingTopHash
          ? batch.findIndex((e: any) => e.txHash === existingTopHash)
          : -1;
        if (overlapIdx > 0) {
          newEvents.push(...batch.slice(0, overlapIdx));
          break;
        }
        if (overlapIdx === 0) break;

        newEvents.push(...batch);
        nextCommitment = ret.commitment;
        if (++guard > 50) break; // safety guard
      }

      if (newEvents.length > 0) {
        this.records = [...newEvents, ...this.records];
      }
    } catch (err) {
      console.error('[RecordService] Failed to update records:', err);
    }
  }

  /** Public method without artificial delay */
  async updateRecord(): Promise<void> {
    await this._updateRecord();
  }

  /** Clear memory */
  clear(): void {
    this.records = [];
    this.currentCommitment = null;
  }
}
