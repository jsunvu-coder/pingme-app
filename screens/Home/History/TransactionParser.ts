// helpers/TransactionParser.ts

import { TransactionAction, TransactionViewModel } from './TransactionViewModel';

const ACTION_MAP: Record<number, TransactionAction> = {
  0: 'Claim',
  2: 'New Balance',
  3: 'Deposit',
  4: 'Wallet Deposit',
  5: 'Reclaim',
  6: 'Send',
  7: 'Withdrawal',
  8: 'QR Pay', // refined below
  9: 'Payment',
};

export function parseTransaction(raw: any, currentCommitment?: string): TransactionViewModel {
  const action = Number(raw.action ?? -1);
  let type: TransactionAction = ACTION_MAP[action] ?? 'Unknown';

  const amountMicro = raw.amount ?? '0';
  const amountNumeric = Number(amountMicro);
  const amount = Number.isFinite(amountNumeric) ? amountNumeric / 1_000_000 : 0;

  const fromCommitment = (raw.fromCommitment ?? raw.from_commitment ?? '').toLowerCase();
  const toCommitment = (raw.toCommitment ?? raw.to_commitment ?? '').toLowerCase();
  const normalizedCommitment = (currentCommitment ?? '').toLowerCase();

  // 🧩 refine dynamic types
  if (action === 8) {
    if (fromCommitment) type = 'QR Pay';
    if (toCommitment) type = 'QR Receive';
  } else if (action === 0) {
    // refine Claim vs Payment based on commitments
    if (toCommitment) type = 'Claim';
    else if (fromCommitment) type = 'Payment';
  }

  const positiveTypes: TransactionAction[] = [
    'Claim',
    'Reclaim',
    'Wallet Deposit',
    'Deposit',
    'New Balance',
    'QR Receive',
  ];

  let direction: 'send' | 'receive' | 'other' = 'other';
  if (normalizedCommitment) {
    if (toCommitment && toCommitment === normalizedCommitment) direction = 'receive';
    else if (fromCommitment && fromCommitment === normalizedCommitment) direction = 'send';
  }

  if (direction === 'other') {
    direction = positiveTypes.includes(type) ? 'receive' : 'send';
  }

  const isPositive = direction !== 'send';
  const formattedAmount = `${isPositive ? '+' : '-'} ${Math.abs(amount).toFixed(2)}`;

  const timestampSeconds = Number(raw.timestamp ?? raw.timestampSeconds ?? 0);
  const date = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date(0);
  const formattedDate =
    timestampSeconds && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(date)
      : '-';

  const txHash = raw.txHash ?? raw.tx_hash ?? '';
  const shortHash =
    txHash && txHash.length > 14 ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : txHash;

  return {
    actionCode: action,
    addr: raw.addr ?? '',
    amountRaw: (raw.amount ?? '0').toString(),
    fromCommitment: raw.fromCommitment ?? raw.from_commitment ?? '',
    toCommitment: raw.toCommitment ?? raw.to_commitment ?? '',
    token: raw.token ?? '',
    txHash,
    type,
    isPositive,
    direction,
    amount: Math.abs(amount),
    formattedAmount,
    timestamp: date.getTime(),
    formattedDate,
    dateLabel: formattedDate,
    displayLabel: type,
    shortHash,
    blockNumber: Number(raw.blockNumber ?? 0),
    duration: Number(raw.duration ?? 0),
  };
}
