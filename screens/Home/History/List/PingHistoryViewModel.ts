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
  private static chunkCursor = 0;

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
    this.chunkCursor = 0;
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
    targetPreload?: number;
  }): Promise<TransactionViewModel[]> {
    const commitment = this.contractService.getCrypto()?.commitment ?? '';
    const cacheKey = this.getCacheKey(commitment);

    if (PingHistoryViewModel.cacheKey !== cacheKey) {
      PingHistoryViewModel.resetCache(cacheKey);
    }

    if (!PingHistoryViewModel.localCacheLoaded) {
      await PingHistoryViewModel.loadFromLocalCache(cacheKey);
    }

    // If cached transactions exist, surface them immediately and keep the cursor at full cache size.
    const cachedFull = PingHistoryViewModel.cachedTransactions;
    if (cachedFull.length) {
      PingHistoryViewModel.chunkCursor = cachedFull.length;
      PingHistoryViewModel.nextIndex = cachedFull.length;
      options?.onPhaseUpdate?.(cachedFull);
    }

    const ensureFetch = async () => {
      if (!PingHistoryViewModel.inflight) {
        PingHistoryViewModel.inflight = this.fetchAndHydrate({
          cacheKey,
          commitment,
          pageSize: options?.pageSize,
          targetPreload: options?.targetPreload,
          onPhaseUpdate: options?.onPhaseUpdate,
        }).finally(() => {
          PingHistoryViewModel.inflight = null;
        });
      } else if (options?.onPhaseUpdate) {
        // forward inflight updates to new callers
        const unsubscribe = PingHistoryViewModel.subscribe((txs) => {
          options.onPhaseUpdate?.(txs);
        });
        PingHistoryViewModel.inflight.finally(() => unsubscribe());
      }
      return PingHistoryViewModel.inflight;
    };

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
      const fromCommitment = event.fromCommitment ?? '';
      const toCommitment = event.toCommitment ?? '';
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

    // If the same lockbox has both a Payment (action 9) and a Claim (action 0),
    // keep the Payment and drop the Claim.
    const lockboxesWithPayment: Record<string, { hasPayment: boolean; hasClaim: boolean }> = {};
    for (const tx of events) {
      const lockbox = tx.lockboxCommitment?.toLowerCase();
      if (!lockbox) continue;
      if (!lockboxesWithPayment[lockbox]) {
        lockboxesWithPayment[lockbox] = { hasPayment: false, hasClaim: false };
      }
      if (tx.actionCode === 9) lockboxesWithPayment[lockbox].hasPayment = true;
      if (tx.actionCode === 0) lockboxesWithPayment[lockbox].hasClaim = true;
    }

    return events.filter((tx) => {
      if (tx.type !== 'Claim') return true;
      const lockbox = tx.lockboxCommitment?.toLowerCase();
      if (!lockbox) return true;

      const entry = lockboxesWithPayment[lockbox];
      return !entry?.hasPayment;
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
  filterTransactions(
    events: TransactionViewModel[],
    filter: HistoryFilter
  ): TransactionViewModel[] {
    if (filter === 'all') return events;
    return events.filter((e) => {
      switch (filter) {
        case 'sent':
          return e.direction === 'send' && e.type !== 'Withdrawal';
        case 'received':
          return (
            e.direction === 'receive' &&
            !['Deposit', 'Wallet Deposit', 'New Balance', 'Reclaim'].includes(e.type)
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
    // keep for backward compatibility: treat each page as 8 items
    return this.loadMoreChunks(pages, 8);
  }

  /** Whether there are more parsed transactions to paginate */
  static hasMore(): boolean {
    return this.parsedTransactions.length > this.nextIndex;
  }

  /**
   * Load more transactions by chunk (default 8 items per chunk), repeated `times`.
   */
  async loadMoreChunks(times = 1, chunkSize = 8): Promise<TransactionViewModel[]> {
    const commitment = this.contractService.getCrypto()?.commitment ?? '';
    const cacheKey = this.getCacheKey(commitment);
    for (let i = 0; i < times; i++) {
      await this.applyChunk(chunkSize, cacheKey);
    }
    return PingHistoryViewModel.cachedTransactions;
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

  static async prefetchTransactions(options?: {
    pageSize?: number;
    targetPreload?: number;
  }): Promise<TransactionViewModel[]> {
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
        .getTransactions({
          pageSize: options?.pageSize,
          targetPreload: options?.targetPreload,
        })
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
  private async applyChunk(
    count: number,
    cacheKey: string,
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void
  ): Promise<TransactionViewModel[]> {
    if (!PingHistoryViewModel.parsedTransactions.length) {
      return PingHistoryViewModel.cachedTransactions;
    }

    const end = Math.min(
      PingHistoryViewModel.parsedTransactions.length,
      PingHistoryViewModel.nextIndex + count
    );
    if (end <= PingHistoryViewModel.nextIndex) {
      return PingHistoryViewModel.cachedTransactions;
    }

    PingHistoryViewModel.nextIndex = end;
    PingHistoryViewModel.chunkCursor = end;
    const slice = PingHistoryViewModel.parsedTransactions.slice(0, end);
    PingHistoryViewModel.cachedTransactions = slice;
    onPhaseUpdate?.(slice);
    PingHistoryViewModel.notify(slice);
    await PingHistoryViewModel.saveToLocalCache(slice, cacheKey);
    return slice;
  }

  private async fetchAndHydrate(opts: {
    cacheKey: string;
    commitment: string;
    targetPreload?: number;
    pageSize?: number;
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void;
  }): Promise<TransactionViewModel[]> {
    try {
      const { cacheKey, commitment, onPhaseUpdate, pageSize, targetPreload } = opts;

      const records = await this.recordService.getRecord();
      const parsed = this.parseTransactions(records || [], commitment);
      const existing = PingHistoryViewModel.cachedTransactions;
      const seen = new Set<string>();
      const merged: TransactionViewModel[] = [];

      const addTx = (tx: TransactionViewModel) => {
        const key = `${tx.actionCode}-${tx.txHash}-${(
          tx.fromCommitment ?? ''
        ).toLowerCase()}-${(tx.toCommitment ?? '').toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(tx);
      };

      parsed.forEach(addTx);
      existing.forEach(addTx);

      merged.sort((a, b) => b.timestamp - a.timestamp);

      PingHistoryViewModel.parsedTransactions = merged;

      // If we already have cache loaded, avoid reloading old pages; keep full list and save/notify.
      if (existing.length > 0) {
        PingHistoryViewModel.nextIndex = merged.length;
        PingHistoryViewModel.chunkCursor = merged.length;
        PingHistoryViewModel.cachedTransactions = merged;
        onPhaseUpdate?.(merged);
        PingHistoryViewModel.notify(merged);
        await PingHistoryViewModel.saveToLocalCache(merged, cacheKey);
        return merged;
      }

      PingHistoryViewModel.nextIndex = PingHistoryViewModel.chunkCursor || 0;

      const initialPreload = Math.max(pageSize ?? 5, 5);
      const preloadTarget = Math.max(targetPreload ?? 20, initialPreload);

      if (PingHistoryViewModel.nextIndex < initialPreload) {
        await this.applyChunk(
          initialPreload - PingHistoryViewModel.nextIndex,
          cacheKey,
          onPhaseUpdate
        );
      }

      // Stage additional chunks in the background to avoid blocking initial render
      (async () => {
        try {
          while (
            PingHistoryViewModel.parsedTransactions.length > PingHistoryViewModel.nextIndex &&
            PingHistoryViewModel.nextIndex < preloadTarget
          ) {
            const remaining = preloadTarget - PingHistoryViewModel.nextIndex;
            await this.applyChunk(Math.min(8, remaining), cacheKey, onPhaseUpdate);
          }
        } catch (err) {
          console.error('[PingHistoryViewModel] Background chunk preload failed', err);
        }
      })();

      return PingHistoryViewModel.cachedTransactions;
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load transactions', err);
      return PingHistoryViewModel.cachedTransactions;
    }
  }
}
