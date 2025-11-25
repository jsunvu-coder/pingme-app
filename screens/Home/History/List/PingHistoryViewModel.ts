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
  private static cacheKey: string | null = null;

  private getCacheKey(commitment?: string): string {
    const normalized = (commitment ?? '').toLowerCase();
    return `${PING_HISTORY_CACHE_KEY}::${normalized || 'default'}`;
  }

  private static resetCache(newKey: string) {
    this.cacheKey = newKey;
    this.cachedTransactions = [];
    this.localCacheLoaded = false;
  }

  async getTransactions(options?: {
    pageSize?: number;
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void;
  }): Promise<TransactionViewModel[]> {
    const pageSize = options?.pageSize ?? 20;
    try {
      const commitment = this.contractService.getCrypto()?.commitment ?? '';
      const cacheKey = this.getCacheKey(commitment);

      if (PingHistoryViewModel.cacheKey !== cacheKey) {
        PingHistoryViewModel.resetCache(cacheKey);
      }

      if (!PingHistoryViewModel.localCacheLoaded) {
        await PingHistoryViewModel.loadFromLocalCache(cacheKey);
      }

      const records = await this.recordService.getRecord();
      const parsed = this.parseTransactions(records || [], commitment);

      // Phase 1: if we already have cache and nothing new, return cached
      if (!parsed.length && PingHistoryViewModel.cachedTransactions.length) {
        console.warn('[PingHistoryViewModel] Empty fetch, using cached history');
        return PingHistoryViewModel.cachedTransactions;
      }

      const firstPage = parsed.slice(0, pageSize);

      // Phase 1: return first page immediately and cache it
      if (firstPage.length) {
        PingHistoryViewModel.cachedTransactions = firstPage;
        options?.onPhaseUpdate?.(firstPage);
        void PingHistoryViewModel.saveToLocalCache(firstPage, cacheKey);
      }

      // Phase 2: asynchronously update with the rest and cache
      if (parsed.length > firstPage.length) {
        Promise.resolve().then(async () => {
          PingHistoryViewModel.cachedTransactions = parsed;
          options?.onPhaseUpdate?.(parsed);
          await PingHistoryViewModel.saveToLocalCache(parsed, cacheKey);
        });
      } else {
        // If only one page, keep cache in sync
        await PingHistoryViewModel.saveToLocalCache(parsed, cacheKey);
      }

      return firstPage.length ? firstPage : parsed;
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

    const cleaned = this.removeClaimPaymentPairs(parsed);

    // sort newest → oldest
    return cleaned.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Hide redundant Payment entries that correspond to the same blockchain event
   * as a Claim. Claiming a pay link emits both a Payment (debit) and Claim
   * (credit) event with identical metadata, which looked like duplicates in the UI.
   */
  private removeClaimPaymentPairs(events: TransactionViewModel[]): TransactionViewModel[] {
    if (!events.length) return events;

    const claimHashes = new Set<string>();
    const claimLockboxes = new Set<string>();
    const claimTimeAmountKeys = new Set<string>();

    for (const tx of events) {
      if (tx.type !== 'Claim') continue;

      if (tx.txHash) claimHashes.add(tx.txHash.toLowerCase());
      if (tx.lockboxCommitment) claimLockboxes.add(tx.lockboxCommitment.toLowerCase());
      if (tx.timestamp) {
        claimTimeAmountKeys.add(`${tx.timestamp}-${tx.amount}`);
      }
    }

    return events.filter((tx) => {
      if (tx.type !== 'Payment') return true;

      const txHash = tx.txHash?.toLowerCase();
      if (txHash && claimHashes.has(txHash)) return false;

      // Only hide inbound/positive payments that duplicate a Claim.
      if (tx.direction === 'send' || !tx.isPositive) return true;

      const lockbox = tx.lockboxCommitment?.toLowerCase();
      if (lockbox && claimLockboxes.has(lockbox)) return false;

      if (tx.timestamp && claimTimeAmountKeys.has(`${tx.timestamp}-${tx.amount}`)) {
        return false;
      }

      return true;
    });
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
          return e.direction === 'send' && e.type !== 'Withdrawal';
        case 'received':
          return (
            e.direction === 'receive' &&
            !['Deposit', 'Wallet Deposit', 'New Balance'].includes(e.type)
          );
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

  static getCachedTransactions(commitment?: string): TransactionViewModel[] {
    const cacheKey = `${PING_HISTORY_CACHE_KEY}::${(commitment ?? '').toLowerCase() || 'default'}`;
    if (this.cacheKey !== cacheKey) return [];
    return this.cachedTransactions;
  }

  /**
   * Ensure local cache for the current commitment is loaded and return it.
   * Safe to call before rendering previews.
   */
  static async loadCachedTransactions(commitment?: string): Promise<TransactionViewModel[]> {
    const cacheKey = `${PING_HISTORY_CACHE_KEY}::${(commitment ?? '').toLowerCase() || 'default'}`;
    if (this.cacheKey !== cacheKey) {
      this.resetCache(cacheKey);
    }

    if (!this.localCacheLoaded) {
      await this.loadFromLocalCache(cacheKey);
    }

    return this.cachedTransactions;
  }

  /**
   * Load cached transactions from local storage
   */
  static async loadFromLocalCache(cacheKey: string): Promise<TransactionViewModel[]> {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as TransactionViewModel[];
        this.cachedTransactions = parsed;
        this.localCacheLoaded = true;
        this.cacheKey = cacheKey;
        console.log(
          '[PingHistoryViewModel] Loaded',
          parsed.length,
          'transactions from local cache for key',
          cacheKey
        );
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
  static async saveToLocalCache(
    transactions: TransactionViewModel[],
    cacheKey: string
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(transactions));
      console.log(
        '[PingHistoryViewModel] Saved',
        transactions.length,
        'transactions to local cache for key',
        cacheKey
      );
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to save to local cache', err);
    }
  }

  static async prefetchTransactions(): Promise<TransactionViewModel[]> {
    // If already fetching, return the inflight promise
    if (this.inflight) return this.inflight;

    const commitment = ContractService.getInstance().getCrypto()?.commitment ?? '';
    const cacheKey = `${PING_HISTORY_CACHE_KEY}::${commitment.toLowerCase() || 'default'}`;

    if (this.cacheKey !== cacheKey) {
      this.resetCache(cacheKey);
    }

    // Load from local cache first if not already loaded
    if (!this.localCacheLoaded) {
      await this.loadFromLocalCache(cacheKey);
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
