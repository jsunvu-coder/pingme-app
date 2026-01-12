import { ContractService } from 'business/services/ContractService';
import { RecordEntry } from 'business/Types';
import { PAGINATION } from 'business/Config';
import { parseTransaction } from 'screens/Home/History/List/TransactionParser';
import { TransactionViewModel } from 'screens/Home/History/List/TransactionViewModel';
import { setTransactions } from './historySlice';
import type { AppDispatch } from './index';

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
      const res: any = await contractService.getEvents(nextCommitment, PAGINATION);
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

  // Update Redux store
  dispatch(setTransactions(parsed));

  return parsed;
}
