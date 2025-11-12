import { RecordEntry } from 'business/Types';
import { RecordService } from 'business/services/RecordService';
import { ContractService } from 'business/services/ContractService';
import { parseTransaction } from './TransactionParser';
import { TransactionViewModel } from './TransactionViewModel';

export type HistoryFilter = 'all' | 'sent' | 'received' | 'deposit' | 'withdraw' | 'reclaim';

export class PingHistoryViewModel {
  private recordService = RecordService.getInstance();
  private contractService = ContractService.getInstance();

  async getTransactions(): Promise<TransactionViewModel[]> {
    try {
      const records = await this.recordService.getRecord();
      const commitment = this.contractService.getCrypto()?.commitment ?? '';
      return this.parseTransactions(records || [], commitment);
    } catch (err) {
      console.error('[PingHistoryViewModel] Failed to load transactions', err);
      return [];
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
      const key = `${action}-${txHash}`;

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
}
