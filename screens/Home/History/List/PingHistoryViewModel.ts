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
  private static recordUnsubscribe: (() => void) | null = null;
  private static recordListenerKey: string | null = null;

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

  private ensureRecordSubscription(cacheKey: string, commitment: string) {
    if (PingHistoryViewModel.recordListenerKey === cacheKey && PingHistoryViewModel.recordUnsubscribe) {
      return;
    }

    PingHistoryViewModel.recordUnsubscribe?.();
    PingHistoryViewModel.recordUnsubscribe = null;
    PingHistoryViewModel.recordListenerKey = cacheKey;

    const listener = (raw: RecordEntry[]) => {
      try {
        if (!Array.isArray(raw) || raw.length === 0) return;
        // Only apply updates for the currently active commitment.
        const current = (this.contractService.getCrypto()?.commitment ?? '').toLowerCase();
        if (!current || current !== commitment.toLowerCase()) return;

        const parsed = this.parseTransactions(raw, commitment);
        if (!parsed.length) return;

        const prev = PingHistoryViewModel.parsedTransactions;
        const prevKeySet = new Set<string>();
        for (const tx of prev) {
          prevKeySet.add(
            `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
              tx.toCommitment ?? ''
            ).toLowerCase()}`
          );
        }

        const seen = new Set<string>();
        const merged: TransactionViewModel[] = [];
        const addTx = (tx: TransactionViewModel) => {
          const key = `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
            tx.toCommitment ?? ''
          ).toLowerCase()}`;
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(tx);
        };

        parsed.forEach(addTx);
        prev.forEach(addTx);
        merged.sort((a, b) => b.timestamp - a.timestamp);

        let added = 0;
        for (const tx of merged) {
          const key = `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
            tx.toCommitment ?? ''
          ).toLowerCase()}`;
          if (!prevKeySet.has(key)) added++;
        }

        if (added <= 0) return;

        const baselineCursor = PingHistoryViewModel.nextIndex;
        const nextCursor = Math.min(merged.length, baselineCursor + added);

        PingHistoryViewModel.parsedTransactions = merged;
        PingHistoryViewModel.nextIndex = nextCursor;
        PingHistoryViewModel.chunkCursor = nextCursor;
        PingHistoryViewModel.cachedTransactions = merged.slice(0, nextCursor);
        PingHistoryViewModel.notify(PingHistoryViewModel.cachedTransactions);
        void PingHistoryViewModel.saveToLocalCache(PingHistoryViewModel.cachedTransactions, cacheKey);
      } catch (err) {
        console.error('[PingHistoryViewModel] Failed to apply RecordService update', err);
      }
    };

    this.recordService.onRecordChange(listener);
    PingHistoryViewModel.recordUnsubscribe = () => this.recordService.offRecordChange(listener);
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
    preferFirstPage?: boolean;
  }): Promise<TransactionViewModel[]> {
    const commitment = this.contractService.getCrypto()?.commitment ?? '';
    const cacheKey = this.getCacheKey(commitment);
    const initialLimit = Math.max(options?.pageSize ?? 5, 5);

    if (PingHistoryViewModel.cacheKey !== cacheKey) {
      PingHistoryViewModel.resetCache(cacheKey);
    }

    this.ensureRecordSubscription(cacheKey, commitment);

    if (!PingHistoryViewModel.localCacheLoaded) {
      await PingHistoryViewModel.loadFromLocalCache(cacheKey);
    }

    // If cached transactions exist, surface them immediately and keep the cursor at full cache size.
    const cachedFull = PingHistoryViewModel.cachedTransactions;
    if (cachedFull.length) {
      const initialCached = cachedFull.slice(0, initialLimit);
      PingHistoryViewModel.chunkCursor = cachedFull.length;
      PingHistoryViewModel.nextIndex = cachedFull.length;
      options?.onPhaseUpdate?.(initialCached);
    }

    const ensureFetch = async () => {
      if (!PingHistoryViewModel.inflight) {
        PingHistoryViewModel.inflight = this.fetchAndHydrate({
          cacheKey,
          commitment,
          pageSize: options?.pageSize,
          targetPreload: options?.targetPreload,
          onPhaseUpdate: options?.onPhaseUpdate,
          preferFirstPage: options?.preferFirstPage,
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
    const parseActionCode = (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'string') {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        if (!Number.isNaN(numeric)) return numeric;
      }

      const n = Number(value ?? -1);
      return Number.isFinite(n) ? n : -1;
    };

    const lockboxesWithPayment = new Set<string>();
    for (const event of rawEvents) {
      const action = parseActionCode((event as any).action);
      if (action !== 9) continue;
      const lockboxCommitment = (
        (event as any).lockboxCommitment ??
        (event as any).lockbox_commitment ??
        ''
      ).toLowerCase();
      if (lockboxCommitment) lockboxesWithPayment.add(lockboxCommitment);
    }

    const seen = new Set<string>();
    const seenLockboxes = new Set<string>();
    const parsed: TransactionViewModel[] = [];

    for (const event of rawEvents) {
      const action = parseActionCode((event as any).action);
      const rawTo = (event as any).toCommitment ?? (event as any).to_commitment ?? '';

      // 🔎 Align with web filter: keep Claim only when toCommitment exists, or any action >= 2.
      if (!((action === 0 && rawTo) || action >= 2)) {
        continue;
      }

      const txHash = (event as any).txHash ?? (event as any).tx_hash ?? '';
      const fromCommitment = (event as any).fromCommitment ?? (event as any).from_commitment ?? '';
      const toCommitment = (event as any).toCommitment ?? (event as any).to_commitment ?? '';
      const lockboxCommitment = (
        (event as any).lockboxCommitment ??
        (event as any).lockbox_commitment ??
        ''
      ).toLowerCase();

      const fallbackHash =
        txHash ||
        lockboxCommitment ||
        fromCommitment ||
        toCommitment ||
        String(event.timestamp ?? '');
      const key = `${action}-${fallbackHash}-${fromCommitment.toLowerCase()}-${toCommitment.toLowerCase()}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const normalizedEvent = {
        ...(event as any),
        action,
        txHash,
        fromCommitment,
        toCommitment,
        lockboxCommitment,
      };
      const tx = parseTransaction(normalizedEvent, commitment);
      if (tx) parsed.push(tx);
    }

    // sort newest → oldest
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  }

  groupByDate(events: TransactionViewModel[]): Record<string, TransactionViewModel[]> {
    return events.reduce<Record<string, TransactionViewModel[]>>((acc, event) => {
      const timestamp = Number(event.timestamp);
      const hasValidTimestamp = Number.isFinite(timestamp) && timestamp > 0;

      // 🗓 Format as "dd/MM/yyyy"
      const key = (() => {
        if (!hasValidTimestamp) return 'Unknown';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return 'Unknown';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      })();

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
    this.localCacheLoaded = true;
    this.cacheKey = cacheKey;
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
    preferFirstPage?: boolean;
  }): Promise<TransactionViewModel[]> {
    try {
      const { cacheKey, commitment, onPhaseUpdate, pageSize, targetPreload, preferFirstPage } = opts;
      const requestedInitial = Math.max(pageSize ?? 5, 5);
      const preloadTarget = Math.max(targetPreload ?? 25, requestedInitial);

      let nextCommitment = commitment.toLowerCase();

      const first = await this.contractService.getEvents(nextCommitment, requestedInitial);
      const firstBatch = this.parseTransactions(first?.events ?? [], commitment);

      const existing = PingHistoryViewModel.parsedTransactions;
      const seen = new Set<string>();
      const merged: TransactionViewModel[] = [];
      const addTx = (tx: TransactionViewModel) => {
        const key = `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
          tx.toCommitment ?? ''
        ).toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(tx);
      };
      firstBatch.forEach(addTx);
      existing.forEach(addTx);
      merged.sort((a, b) => b.timestamp - a.timestamp);

      const base = Math.min(merged.length, Math.max(existing.length, requestedInitial));
      PingHistoryViewModel.parsedTransactions = merged;
      PingHistoryViewModel.nextIndex = base;
      PingHistoryViewModel.chunkCursor = base;
      PingHistoryViewModel.cachedTransactions = merged.slice(0, base);
      onPhaseUpdate?.(PingHistoryViewModel.cachedTransactions);
      PingHistoryViewModel.notify(PingHistoryViewModel.cachedTransactions);
      await PingHistoryViewModel.saveToLocalCache(PingHistoryViewModel.cachedTransactions, cacheKey);

      nextCommitment = (first?.commitment ?? '').toLowerCase();

      (async () => {
        try {
          let guard = 0;
          while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
            if (preferFirstPage && PingHistoryViewModel.nextIndex >= preloadTarget) break;
            const ret = await this.contractService.getEvents(nextCommitment, requestedInitial);
            const raw = ret?.events ?? [];
            if (!raw.length) break;
            nextCommitment = (ret?.commitment ?? '').toLowerCase();

            const parsedNew = this.parseTransactions(raw, commitment);

            const prevLen = PingHistoryViewModel.parsedTransactions.length;
            const seen2 = new Set<string>();
            const merged2: TransactionViewModel[] = [];
            const addTx2 = (tx: TransactionViewModel) => {
              const key = `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
                tx.toCommitment ?? ''
              ).toLowerCase()}`;
              if (seen2.has(key)) return;
              seen2.add(key);
              merged2.push(tx);
            };
            parsedNew.forEach(addTx2);
            PingHistoryViewModel.parsedTransactions.forEach(addTx2);
            merged2.sort((a, b) => b.timestamp - a.timestamp);
            PingHistoryViewModel.parsedTransactions = merged2;

            const added = Math.max(merged2.length - prevLen, 0);
            if (added > 0) {
              await this.applyChunk(added, cacheKey, onPhaseUpdate);
            }

            if (++guard > 400) break;
          }
        } catch (err) {
          console.error('[PingHistoryViewModel] Background incremental fetch failed', err);
        }
      })();

      return PingHistoryViewModel.cachedTransactions;
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load transactions', err);
      return PingHistoryViewModel.cachedTransactions;
    }
  }

  private async hydrateWithParsed(params: {
    parsed: TransactionViewModel[];
    cacheKey: string;
    onPhaseUpdate?: (transactions: TransactionViewModel[]) => void;
    requestedInitial: number;
    preloadTarget: number;
  }): Promise<TransactionViewModel[]> {
    const { parsed, cacheKey, onPhaseUpdate, requestedInitial, preloadTarget } = params;
    const existing = PingHistoryViewModel.cachedTransactions;
    const seen = new Set<string>();
    const merged: TransactionViewModel[] = [];

    const addTx = (tx: TransactionViewModel) => {
      const key = `${tx.actionCode}-${tx.txHash}-${(tx.fromCommitment ?? '').toLowerCase()}-${(
        tx.toCommitment ?? ''
      ).toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(tx);
    };

    parsed.forEach(addTx);
    existing.forEach(addTx);

    merged.sort((a, b) => b.timestamp - a.timestamp);

    const baselineCursor = Math.min(merged.length, Math.max(existing.length, requestedInitial));
    PingHistoryViewModel.parsedTransactions = merged;
    PingHistoryViewModel.nextIndex = baselineCursor;
    PingHistoryViewModel.chunkCursor = baselineCursor;
    PingHistoryViewModel.cachedTransactions = merged.slice(0, baselineCursor);
    onPhaseUpdate?.(PingHistoryViewModel.cachedTransactions);
    PingHistoryViewModel.notify(PingHistoryViewModel.cachedTransactions);
    await PingHistoryViewModel.saveToLocalCache(PingHistoryViewModel.cachedTransactions, cacheKey);

    // Stage additional chunks in the background (5 at a time) until preload target is reached.
    const targetCursor = Math.min(merged.length, Math.max(preloadTarget, baselineCursor));
    if (PingHistoryViewModel.nextIndex < targetCursor) {
      (async () => {
        try {
          while (
            PingHistoryViewModel.parsedTransactions.length > PingHistoryViewModel.nextIndex &&
            PingHistoryViewModel.nextIndex < targetCursor
          ) {
            const remaining = targetCursor - PingHistoryViewModel.nextIndex;
            await this.applyChunk(Math.min(5, remaining), cacheKey, onPhaseUpdate);
          }
        } catch (err) {
          console.error('[PingHistoryViewModel] Background chunk preload failed', err);
        }
      })();
    }

    return PingHistoryViewModel.cachedTransactions;
  }
}
