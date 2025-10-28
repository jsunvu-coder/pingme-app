import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { BalanceEntry, RecordEntry } from 'business/Types';
import { RecordService } from './RecordService';

export class AccountDataService {
  private static instance: AccountDataService;

  private balances: BalanceEntry[] = [];
  private records: RecordEntry[] = [];
  private forwarder: string | null = null;

  private lastUpdated: number | null = null;
  private loading = false;
  private refreshPromise: Promise<void> | null = null;

  email?: string;

  private readonly balanceService = BalanceService.getInstance();
  private readonly recordService = RecordService.getInstance();
  private readonly contractService = ContractService.getInstance();

  private constructor() {}

  static getInstance(): AccountDataService {
    if (!AccountDataService.instance) {
      AccountDataService.instance = new AccountDataService();
    }
    return AccountDataService.instance;
  }

  getBalances(): BalanceEntry[] {
    return this.balances;
  }

  getRecords(): RecordEntry[] {
    return this.records;
  }

  getForwarderValue(): string | null {
    return this.forwarder;
  }

  getLastUpdated(): number | null {
    return this.lastUpdated;
  }

  isLoading(): boolean {
    return this.loading;
  }

  async refreshData(force = false): Promise<void> {
    if (this.loading && !force) {
      console.log('⏳ AccountDataService: already loading, skipping duplicate call.');
      return this.refreshPromise ?? Promise.resolve();
    }

    this.loading = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 AccountDataService refreshing data...');

        // 1️⃣ Fetch balance
        await this.balanceService.getBalance();
        this.balances = this.balanceService.currentBalances ?? [];

        // 2️⃣ Fetch events
        const events = this.recordService.getRecords();
        this.records.push(...events);

        // 3️⃣ Optionally refresh forwarder
        await this.getForwarder(true); // refresh cache silently

        this.lastUpdated = Date.now();

        console.log(
          `✅ AccountDataService refreshed: ${this.balances.length} balances, ${this.records.length} events, forwarder=${this.forwarder}`
        );
      } catch (err) {
        console.error('❌ AccountDataService refresh failed:', err);
      } finally {
        this.loading = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getOrFetchData(): Promise<{
    balances: BalanceEntry[];
    records: RecordEntry[];
    forwarder: string | null;
  }> {
    if (this.records.length > 0 && this.balances.length > 0 && this.forwarder) {
      console.log('📦 Returning cached AccountDataService data.');
      return {
        balances: this.balances,
        records: this.records,
        forwarder: this.forwarder,
      };
    }

    await this.refreshData();
    return {
      balances: this.balances,
      records: this.records,
      forwarder: this.forwarder,
    };
  }

  async getForwarder(force = false): Promise<string | null> {
    // if cached and not forced, return existing
    if (this.forwarder && !force) {
      return this.forwarder;
    }

    try {
      const cr = this.contractService.getCrypto();
      if (!cr?.commitment) {
        console.warn('⚠️ AccountDataService: Missing commitment for forwarder request.');
        return null;
      }

      const result = await this.contractService.getForwarder(cr.commitment);
      this.forwarder = result?.forwarder || null;

      console.log('✅ Forwarder updated:', this.forwarder);
      return this.forwarder;
    } catch (err) {
      console.error('❌ GET_FORWARDER failed:', err);
      this.forwarder = null;
      return null;
    }
  }

  clearCache(): void {
    this.balances = [];
    this.records = [];
    this.forwarder = null;
    this.lastUpdated = null;
    console.log('🧹 AccountDataService cache cleared.');
  }
}
