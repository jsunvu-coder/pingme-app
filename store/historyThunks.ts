import { ContractService } from 'business/services/ContractService';
import { RecordEntry } from 'business/Types';
import { PAGINATION } from 'business/Config';
import { parseTransaction } from 'screens/Home/History/List/TransactionParser';
import { TransactionViewModel } from 'screens/Home/History/List/TransactionViewModel';
import { setTransactions, addTransactions } from './historySlice';
import type { AppDispatch, RootState } from './index';
import { getStore } from './index';

/**
 * Fetch transactions from API and update Redux store
 * This is a thunk-like function that can be used throughout the app
 */
export async function fetchHistoryToRedux(dispatch: AppDispatch): Promise<TransactionViewModel[]> {
  const contractService = ContractService.getInstance();
  const crypto = contractService.getCrypto();
  const commitment = crypto?.commitment?.toLowerCase();

  if (!commitment) {
    console.warn('[fetchHistoryToRedux] No commitment found, skipping fetch');
    return [];
  }

  const allEvents: RecordEntry[] = [];
  let nextCommitment: string | undefined = commitment;
  let guard = 0;

  try {
    while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
      const res: any = await contractService.getEvents(nextCommitment, 200);
      const events = (res?.events ?? []) as RecordEntry[];
      if (!events.length) break;

      allEvents.push(...events);
      nextCommitment = res?.commitment;

      if (++guard > 400) {
        console.warn('[fetchHistoryToRedux] Reached safety guard while fetching events');
        break;
      }
    }
  } catch (err) {
    console.error('[fetchHistoryToRedux] Failed to fetch events from API', err);
    return [];
  }

  const parsed: TransactionViewModel[] = [];
  for (const ev of allEvents) {
    const tx = parseTransaction(ev, commitment);
    if (tx) parsed.push(tx);
  }

  // Newest → oldest
  parsed.sort((a, b) => b.timestamp - a.timestamp);

  // Update Redux store (full reload, no nextCommitment)
  dispatch(setTransactions({ items: parsed, nextCommitment: null }));

  return parsed;
}

/**
 * Fetch only the 5 most recent transactions from API and add to Redux store
 * Optimized for quick refresh (e.g., on HomeScreen)
 * Only adds new transactions (merges with existing, avoids duplicates)
 */
export async function fetchRecentHistoryToRedux(
  dispatch: AppDispatch
): Promise<TransactionViewModel[]> {
  const contractService = ContractService.getInstance();
  const crypto = contractService.getCrypto();
  const commitment = crypto?.commitment?.toLowerCase();

  if (!commitment) {
    console.warn('[fetchRecentHistoryToRedux] No commitment found, skipping fetch');
    return [];
  }

  try {
    // Only fetch the first page (8 items from PAGINATION)
    const res: any = await contractService.getEvents(commitment, PAGINATION);
    const events = (res?.events ?? []) as RecordEntry[];
    if (!events.length) return [];

    // Parse events
    const recent: TransactionViewModel[] = [];
    for (const ev of events) {
      const tx = parseTransaction(ev, commitment);
      if (tx) recent.push(tx);
    }

    // Newest → oldest
    recent.sort((a, b) => b.timestamp - a.timestamp);

    // Add new transactions to Redux store (merges with existing, avoids duplicates)
    dispatch(addTransactions({ items: recent, nextCommitment: res?.commitment }));

    // Return current store state (after merge)
    const store = await getStore();
    const state = store.getState() as RootState;
    return state.history.items.slice(0, 5);
  } catch (err) {
    console.error('[fetchRecentHistoryToRedux] Failed to fetch events from API', err);
    return [];
  }
}

/**
 * Load initial history (first page only)
 * Used when screen first loads or when store is empty
 */
export async function loadInitialHistoryToRedux(dispatch: AppDispatch): Promise<boolean> {
  const contractService = ContractService.getInstance();
  const crypto = contractService.getCrypto();
  const commitment = crypto?.commitment?.toLowerCase();

  if (!commitment) {
    console.warn('[loadInitialHistoryToRedux] No commitment found, skipping fetch');
    return false;
  }

  try {
    // Fetch the first page (8 items from PAGINATION)
    const res: any = await contractService.getEvents(commitment, PAGINATION);
    const events = (res?.events ?? []) as RecordEntry[];
    if (!events.length) {
      dispatch(setTransactions({ items: [], nextCommitment: null }));
      return false;
    }

    // Parse events
    const parsed: TransactionViewModel[] = [];
    for (const ev of events) {
      const tx = parseTransaction(ev, commitment);
      if (tx) parsed.push(tx);
    }

    // Newest → oldest
    parsed.sort((a, b) => b.timestamp - a.timestamp);

    // Update Redux store with first page
    dispatch(setTransactions({ items: parsed, nextCommitment: res?.commitment }));

    return true;
  } catch (err) {
    console.error('[loadInitialHistoryToRedux] Failed to fetch events from API', err);
    return false;
  }
}

/**
 * Load more history (next page)
 * Used for pagination/load more functionality
 * Compares item count before and after addTransactions to detect new items
 * If no new items found (count unchanged), continues calling up to 5 times before stopping
 */
export async function loadMoreHistoryToRedux(dispatch: AppDispatch): Promise<boolean> {
  const store = await getStore();
  let state = store.getState() as RootState;
  let nextCommitment = state.history.nextCommitment;

  if (!nextCommitment || /^0x0+$/.test(nextCommitment)) {
    // No more items to load
    return false;
  }

  const contractService = ContractService.getInstance();
  const crypto = contractService.getCrypto();
  const commitment = crypto?.commitment?.toLowerCase();
  let emptyCount = 0; // Count consecutive calls with no new items
  const MAX_EMPTY_RETRIES = 10;

  try {
    while (nextCommitment && !/^0x0+$/.test(nextCommitment)) {
      // Get current item count before adding
      state = store.getState() as RootState;
      const itemsCountBefore = state.history.items.length;

      // Fetch the next page using nextCommitment from previous getEvents response
      const res: any = await contractService.getEvents(nextCommitment, PAGINATION);
      const events = (res?.events ?? []) as RecordEntry[];

      // Update nextCommitment for next iteration
      nextCommitment = res?.commitment;

      if (!events.length) {
        // No events in response - update nextCommitment and continue
        dispatch(addTransactions({ items: [], nextCommitment }));
        emptyCount++;
        if (emptyCount >= MAX_EMPTY_RETRIES) {
          // Stop after 5 consecutive calls with no new items
          return false;
        }
        continue;
      }

      // Parse events
      const parsed: TransactionViewModel[] = [];
      for (const ev of events) {
        const tx = parseTransaction(ev, commitment);
        if (tx) parsed.push(tx);
      }

      // Newest → oldest (will be merged and re-sorted by addTransactions)
      parsed.sort((a, b) => b.timestamp - a.timestamp);

      // Add new transactions to Redux store (merges with existing, avoids duplicates)
      dispatch(addTransactions({ items: parsed, nextCommitment }));

      // Check if items count increased (new items were added)
      state = store.getState() as RootState;
      const itemsCountAfter = state.history.items.length;

      if (itemsCountAfter > itemsCountBefore) {
        // New items were added - reset empty count and return success
        emptyCount = 0;
        return true;
      } else {
        // No new items (all were duplicates) - increment empty count
        emptyCount++;
        if (emptyCount >= MAX_EMPTY_RETRIES) {
          // Stop after 5 consecutive calls with no new items
          return false;
        }
        // Continue to next iteration
      }
    }

    // No more commitment to fetch
    dispatch(addTransactions({ items: [], nextCommitment: null }));
    return false;
  } catch (err) {
    console.error('[loadMoreHistoryToRedux] Failed to fetch events from API', err);
    return false;
  }
}
