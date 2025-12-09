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
    const seenLockboxes = new Set<string>();
    const parsed: TransactionViewModel[] = [];

    for (const event of rawEvents) {
      const action = Number(event.action ?? -1);
      const rawTo = event.toCommitment ?? event.to_commitment ?? '';

      // 🔎 Align with web filter: keep Claim only when toCommitment exists, or any action >= 2.
      if (!((action === 0 && rawTo) || action >= 2)) {
        continue;
      }

      const txHash = event.txHash ?? '';
      const fromCommitment = event.fromCommitment ?? '';
      const toCommitment = event.toCommitment ?? '';
      const lockboxCommitment = (event.lockboxCommitment ?? '').toLowerCase();

      if (action === 0 && lockboxCommitment) {
        if (seenLockboxes.has(lockboxCommitment)) {
          continue;
        }
        seenLockboxes.add(lockboxCommitment);
      }

      const fallbackHash =
        txHash ||
        lockboxCommitment ||
        fromCommitment ||
        toCommitment ||
        String(event.timestamp ?? '');
      const key = `${action}-${fallbackHash}-${fromCommitment}-${toCommitment}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const tx = parseTransaction(event, commitment);
      if (tx) parsed.push(tx);
    }

    // sort newest → oldest
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  }

  groupByDate(events: TransactionViewModel[]): Record<string, TransactionViewModel[]> {
    return events.reduce<Record<string, TransactionViewModel[]>>((acc, event) => {
      if (!event.timestamp) return acc;

      // 🗓 Format as "dd/MM/yyyy"
      const date = new Date(event.timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const key = `${day}/${month}/${year}`;

      if (!acc[key]) acc[key] = [];
      acc[key].push(event);

      return acc;
    }, {});
  }

  filterTransactions(
    events: TransactionViewModel[],
    filter: HistoryFilter
  ): TransactionViewModel[] {
    if (!Array.isArray(events)) return [];
    if (filter === 'all') return events;

    const isDeposit = (tx: TransactionViewModel) =>
      tx.type === 'Deposit' || tx.type === 'Wallet Deposit';
    const isWithdraw = (tx: TransactionViewModel) => tx.type === 'Withdrawal';
    const isReclaim = (tx: TransactionViewModel) => tx.type === 'Reclaim';

    switch (filter) {
      case 'sent':
        return events.filter(
          (tx) => tx.direction === 'send' && !isWithdraw(tx) && !isReclaim(tx)
        );
      case 'received':
        return events.filter(
          (tx) => tx.direction === 'receive' && !isDeposit(tx) && !isReclaim(tx)
        );
      case 'deposit':
        return events.filter(isDeposit);
      case 'withdraw':
        return events.filter(isWithdraw);
      case 'reclaim':
        return events.filter(isReclaim);
      default:
        return events;
    }
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
