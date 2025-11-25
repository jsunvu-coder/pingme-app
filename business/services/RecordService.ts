// services/RecordService.ts
import { ContractService } from './ContractService';
import { RecordEntry } from 'business/Types';
import { PAGINATION } from '../Config';

export class RecordService {
  private static instance: RecordService;

  private records: RecordEntry[] = [];
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
      if (!cr?.commitment) return this.records;

      const allRecords: RecordEntry[] = [];
      let nextCommitment: string | undefined = cr.commitment;

      while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
        const ret = await this.contractService.getEvents(nextCommitment, PAGINATION);
        allRecords.push(...ret.events);
        nextCommitment = ret.commitment;
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
      if (!cr?.commitment) return;

      const latest = await this.contractService.getEvents(cr.commitment, 2);
      let newEvents = latest.events;

      if (this.records.length > 0) {
        const txHash = this.records[0].txHash;
        const idx = newEvents.findIndex((e: any) => e.txHash === txHash);
        if (idx >= 0) {
          newEvents = newEvents.slice(0, idx);
        }
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
  }
}
