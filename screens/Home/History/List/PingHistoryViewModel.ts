import { RecordEntry } from 'business/Types';
import { RecordService } from 'business/services/RecordService';
import { ContractService } from 'business/services/ContractService';
import { parseTransaction } from './TransactionParser';
import { TransactionViewModel } from './TransactionViewModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HistoryFilter = 'all' | 'sent' | 'received' | 'deposit' | 'withdraw' | 'reclaim';

const PING_HISTORY_CACHE_KEY = '@ping_history_cache';

export class PingHistoryViewModel {
  private recordService = RecordService.getInstance();
  private contractService = ContractService.getInstance();
  private static cachedTransactions: TransactionViewModel[] = [];
  private static inflight: Promise<TransactionViewModel[]> | null = null;
  private static localCacheLoaded = false;

  async getTransactions(): Promise<TransactionViewModel[]> {
    try {
      const records = await this.recordService.getRecord();
      const commitment = this.contractService.getCrypto()?.commitment ?? '';
      const parsed = this.parseTransactions(records || [], commitment);

      if (!parsed.length && PingHistoryViewModel.cachedTransactions.length) {
        console.warn('[PingHistoryViewModel] Empty fetch, using cached history');
        return PingHistoryViewModel.cachedTransactions;
      }

      PingHistoryViewModel.cachedTransactions = parsed;

      // Save to local cache asynchronously (don't block)
      PingHistoryViewModel.saveToLocalCache(parsed).catch((err) =>
        console.warn('[PingHistoryViewModel] Failed to save to local cache', err)
      );

      return parsed;
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load transactions', err);
      return PingHistoryViewModel.cachedTransactions;
    }
  }

  /**
   * Parse and deduplicate transactions by (action + txHash).
   * Keeps only the first occurrence of each unique pair.
   */
  private parseTransactions(rawEvents: RecordEntry[], commitment: string): TransactionViewModel[] {
    const seen = new Set<string>();

    const parsed: TransactionViewModel[] = [];

    for (const event of rawEvents) {
      const txHash = event.txHash ?? '';
      const action = Number(event.action ?? -1);
      const fromCommitment = event.fromCommitment ?? event.from_commitment ?? '';
      const toCommitment = event.toCommitment ?? event.to_commitment ?? '';
      const key = `${action}-${txHash}-${fromCommitment}-${toCommitment}`;

      // ⚠️ Skip duplicates or missing hash
      if (!txHash || seen.has(key)) continue;

      seen.add(key);

      const tx = parseTransaction(event, commitment);
      if (tx) parsed.push(tx);
    }

    // sort newest → oldest
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Group parsed events by calendar day (e.g. 2025-10-28) */
  groupByDate(events: TransactionViewModel[]): Record<string, TransactionViewModel[]> {
    return events.reduce<Record<string, TransactionViewModel[]>>((acc, event) => {
      if (!event.timestamp) return acc;

      // 🗓 Format as "YYYY-MM-DD"
      const date = new Date(event.timestamp);
      const key = date.toISOString().split('T')[0]; // "2025-10-28"

      if (!acc[key]) acc[key] = [];
      acc[key].push(event);

      return acc;
    }, {});
  }

  /** Filter events by direction */
  filterTransactions(events: TransactionViewModel[], filter: HistoryFilter): TransactionViewModel[] {
    if (filter === 'all') return events;
    return events.filter((e) => {
      switch (filter) {
        case 'sent':
          return e.direction === 'send';
        case 'received':
          return e.direction === 'receive';
        case 'deposit':
          return ['Deposit', 'Wallet Deposit', 'New Balance'].includes(e.type);
        case 'withdraw':
          return e.type === 'Withdrawal';
        case 'reclaim':
          return e.type === 'Reclaim';
        default:
          return true;
      }
    });
  }

  static getCachedTransactions(): TransactionViewModel[] {
    return this.cachedTransactions;
  }

  /**
   * Load cached transactions from local storage
   */
  static async loadFromLocalCache(): Promise<TransactionViewModel[]> {
    try {
      const cached = await AsyncStorage.getItem(PING_HISTORY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as TransactionViewModel[];
        this.cachedTransactions = parsed;
        this.localCacheLoaded = true;
        console.log('[PingHistoryViewModel] Loaded', parsed.length, 'transactions from local cache');
        return parsed;
      }
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load local cache', err);
    }
    return [];
  }

  /**
   * Save transactions to local storage
   */
  static async saveToLocalCache(transactions: TransactionViewModel[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PING_HISTORY_CACHE_KEY, JSON.stringify(transactions));
      console.log('[PingHistoryViewModel] Saved', transactions.length, 'transactions to local cache');
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to save to local cache', err);
    }
  }

  static async prefetchTransactions(): Promise<TransactionViewModel[]> {
    // If already fetching, return the inflight promise
    if (this.inflight) return this.inflight;

    // Load from local cache first if not already loaded
    if (!this.localCacheLoaded) {
      await this.loadFromLocalCache();
    }

    // Start fetching fresh data in the background
    const vm = new PingHistoryViewModel();
    this.inflight = vm
      .getTransactions()
      .catch((err) => {
        console.error('[PingHistoryViewModel] Prefetch failed', err);
        return this.cachedTransactions;
      })
      .finally(() => {
        this.inflight = null;
      });

    // Return cached data immediately (if available), fresh data will update in background
    return this.cachedTransactions.length > 0 ? this.cachedTransactions : this.inflight;
  }
}
