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
  private static parsedTransactions: TransactionViewModel[] = [];
  private static inflight: Promise<TransactionViewModel[]> | null = null;
  private static localCacheLoaded = false;
  private static cacheKey: string | null = null;
  private static nextIndex = 0;
  private static pageSize = 20;
  private static subscribers = new Set<(transactions: TransactionViewModel[]) => void>();

  private getCacheKey(commitment?: string): string {
    const normalized = (commitment ?? '').toLowerCase();
    return `${PING_HISTORY_CACHE_KEY}::${normalized || 'default'}`;
  }

  private static resetCache(newKey: string) {
    this.cacheKey = newKey;
    this.cachedTransactions = [];
    this.parsedTransactions = [];
    this.localCacheLoaded = false;
    this.nextIndex = 0;
    this.pageSize = 20;
  }

  static subscribe(listener: (transactions: TransactionViewModel[]) => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private static notify(transactions: TransactionViewModel[]) {
    if (!transactions) return;
    this.subscribers.forEach((listener) => listener(transactions));
  }

  async getTransactions(options?: {
    pageSize?: number;
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void;
    force?: boolean;
  }): Promise<TransactionViewModel[]> {
    const pageSize = options?.pageSize ?? 20;
    PingHistoryViewModel.pageSize = pageSize;
    const commitment = this.contractService.getCrypto()?.commitment ?? '';
    const cacheKey = this.getCacheKey(commitment);

    if (PingHistoryViewModel.cacheKey !== cacheKey) {
      PingHistoryViewModel.resetCache(cacheKey);
    }

    if (!PingHistoryViewModel.localCacheLoaded) {
      await PingHistoryViewModel.loadFromLocalCache(cacheKey);
    }

    // If data already parsed for this commitment and no force refresh, return cached view
    if (
      !options?.force &&
      PingHistoryViewModel.parsedTransactions.length &&
      PingHistoryViewModel.cacheKey === cacheKey
    ) {
      const slice = this.getCachedSlice(pageSize);
      if (slice.length) {
        options?.onPhaseUpdate?.(slice);
        return slice;
      }
    }

    const cachedSlice = PingHistoryViewModel.cachedTransactions.slice(0, pageSize);
    if (cachedSlice.length) {
      options?.onPhaseUpdate?.(cachedSlice);
    }

    const ensureFetch = () => {
      if (!PingHistoryViewModel.inflight) {
        PingHistoryViewModel.inflight = this.fetchAndHydrate({
          cacheKey,
          commitment,
          pageSize,
          onPhaseUpdate: options?.onPhaseUpdate,
        }).finally(() => {
          PingHistoryViewModel.inflight = null;
        });
      } else if (options?.onPhaseUpdate) {
        // forward inflight updates to new callers
        const unsubscribe = PingHistoryViewModel.subscribe((txs) => {
          options.onPhaseUpdate?.(txs.slice(0, pageSize));
        });
        PingHistoryViewModel.inflight.finally(() => unsubscribe());
      }
      return PingHistoryViewModel.inflight;
    };

    // If we already have cached data, return immediately while fetching in background
    if (cachedSlice.length) {
      void ensureFetch();
      return cachedSlice;
    }

    return ensureFetch();
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

  /** Load and append the next N pages (default 3) */
  async loadNextPages(pages = 3): Promise<TransactionViewModel[]> {
    if (!PingHistoryViewModel.parsedTransactions.length) return PingHistoryViewModel.cachedTransactions;
    const cacheKey = PingHistoryViewModel.cacheKey ?? '';
    const next = this.takePages(pages);
    if (next.length !== PingHistoryViewModel.cachedTransactions.length) {
      PingHistoryViewModel.cachedTransactions = next;
      PingHistoryViewModel.notify(next);
      await PingHistoryViewModel.saveToLocalCache(next, cacheKey);
    }
    return PingHistoryViewModel.cachedTransactions;
  }

  /** Whether there are more parsed transactions to paginate */
  static hasMore(): boolean {
    return this.parsedTransactions.length > this.nextIndex;
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
        this.notify(parsed);
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
      this.notify(transactions);
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
    const vm = new PingHistoryViewModel();
    try {
      const commitment = ContractService.getInstance().getCrypto()?.commitment ?? '';
      const cacheKey = `${PING_HISTORY_CACHE_KEY}::${commitment.toLowerCase() || 'default'}`;

      if (this.cacheKey !== cacheKey) {
        this.resetCache(cacheKey);
      }

      if (!this.localCacheLoaded) {
        await this.loadFromLocalCache(cacheKey);
      }

      const cached = this.cachedTransactions;
      const fetchPromise = vm
        .getTransactions()
        .catch((err) => {
          console.error('[PingHistoryViewModel] Prefetch failed', err);
          return this.cachedTransactions;
        });

      return cached.length > 0 ? cached : fetchPromise;
    } catch (err) {
      console.error('[PingHistoryViewModel] Prefetch error', err);
      return this.cachedTransactions;
    }
  }

  /** Internal helper to extend cachedTransactions by N pages */
  private takePages(pages: number): TransactionViewModel[] {
    const end = Math.min(
      PingHistoryViewModel.parsedTransactions.length,
      PingHistoryViewModel.nextIndex + pages * PingHistoryViewModel.pageSize
    );
    if (end <= PingHistoryViewModel.nextIndex) return PingHistoryViewModel.cachedTransactions;

    PingHistoryViewModel.nextIndex = end;
    return PingHistoryViewModel.parsedTransactions.slice(0, end);
  }

  private getCachedSlice(limit: number): TransactionViewModel[] {
    if (PingHistoryViewModel.parsedTransactions.length) {
      const end = Math.min(limit, PingHistoryViewModel.parsedTransactions.length);
      PingHistoryViewModel.nextIndex = end;
      return PingHistoryViewModel.parsedTransactions.slice(0, end);
    }
    const end = Math.min(limit, PingHistoryViewModel.cachedTransactions.length);
    return PingHistoryViewModel.cachedTransactions.slice(0, end);
  }

  private async fetchAndHydrate(opts: {
    cacheKey: string;
    commitment: string;
    pageSize: number;
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void;
  }): Promise<TransactionViewModel[]> {
    try {
      const { cacheKey, commitment, pageSize, onPhaseUpdate } = opts;

      // Fetch first page quickly, then hydrate the rest in background
      const firstBatch = await this.recordService.getFirstPage();
      const parsedFirst = this.parseTransactions(firstBatch || [], commitment);
      PingHistoryViewModel.parsedTransactions = parsedFirst;
      PingHistoryViewModel.nextIndex = 0;

      if (!parsedFirst.length && PingHistoryViewModel.cachedTransactions.length) {
        console.warn('[PingHistoryViewModel] Empty fetch, using cached history');
        return PingHistoryViewModel.cachedTransactions.slice(0, pageSize);
      }

      const firstPage = this.takePages(1);

      if (firstPage.length) {
        PingHistoryViewModel.cachedTransactions = firstPage;
        onPhaseUpdate?.(firstPage);
        PingHistoryViewModel.notify(firstPage);
        void PingHistoryViewModel.saveToLocalCache(firstPage, cacheKey);
      }

      // Load the rest in background so the UI isn't blocked
      Promise.resolve().then(async () => {
        const records = await this.recordService.getRecord();
        const parsed = this.parseTransactions(records || [], commitment);
        PingHistoryViewModel.parsedTransactions = parsed;
        PingHistoryViewModel.nextIndex = Math.max(
          PingHistoryViewModel.nextIndex,
          firstPage.length
        );

        const updated = this.takePages(3);
        if (updated.length !== PingHistoryViewModel.cachedTransactions.length) {
          PingHistoryViewModel.cachedTransactions = updated;
          onPhaseUpdate?.(updated);
          PingHistoryViewModel.notify(updated);
          await PingHistoryViewModel.saveToLocalCache(updated, cacheKey);
        } else if (!firstPage.length) {
          await PingHistoryViewModel.saveToLocalCache(updated, cacheKey);
        }
      });

      return (firstPage.length ? firstPage : parsedFirst).slice(0, pageSize);
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load transactions', err);
      return PingHistoryViewModel.cachedTransactions.slice(0, PingHistoryViewModel.pageSize);
    }
  }
}
