// models/TransactionViewModel.ts

/**
 * Generic transaction view model that can represent
 * all transaction types (Claim, Payment, Reclaim, Withdrawal, etc.)
 */
export type TransactionAction =
  | 'Claim'
  | 'New Balance'
  | 'Deposit'
  | 'Wallet Deposit'
  | 'Reclaim'
  | 'Send'
  | 'Withdrawal'
  | 'QR Pay'
  | 'QR Receive'
  | 'Payment'
  | 'Security Update'
  | 'Unknown'
  | '🧧 HongBao Purchase';

export interface TransactionViewModel {
  /** Raw blockchain fields */
  actionCode: number;
  addr: string;
  amountRaw: string;
  fromCommitment?: string;
  blockNumber: number;
  duration: number;
  toCommitment: string;
  token: string;
  txHash: string;
  lockboxCommitment?: string;

  /** Parsed & display-ready fields */
  type: TransactionAction;
  isPositive: boolean;
  direction: 'send' | 'receive' | 'other';
  amount: number;
  formattedAmount: string;
  timestamp: number;
  formattedDate: string;
  dateLabel: string;
  displayLabel: string;
  shortHash: string;
  bundleUuid?: string;
}
