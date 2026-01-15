// helpers/TransactionParser.ts

import { TransactionAction, TransactionViewModel } from './TransactionViewModel';
import { Utils } from 'business/Utils';

const ACTION_MAP: Record<number, TransactionAction> = {
  0: 'Claim',
  1: 'Security Update',
  2: 'New Balance',
  3: 'Deposit',
  4: 'Wallet Deposit',
  5: 'Reclaim',
  6: 'Send',
  7: 'Withdrawal',
  8: 'QR Pay', // refined below
  9: 'Payment',
};

const HIDDEN_ACTIONS = new Set<number>([1]); // e.g., password change / maintenance events

export function parseTransaction(
  raw: any,
  currentCommitment?: string
): TransactionViewModel | null {
  const action = Number(raw.action ?? -1);
  let type: TransactionAction = ACTION_MAP[action] ?? 'Unknown';

  if (HIDDEN_ACTIONS.has(action)) {
    // Skip non-monetary events entirely from the history UI.
    return null;
  }

  const amountMicroRaw = (raw.amount ?? '0').toString();
  const amountMicro = (() => {
    try {
      return BigInt(amountMicroRaw);
    } catch {
      return 0n;
    }
  })();

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

  const isSelfDirected =
    fromCommitment.length > 0 && fromCommitment === toCommitment && toCommitment.length > 0;

  const positiveTypes: TransactionAction[] = [
    'Claim',
    'Reclaim',
    'Wallet Deposit',
    'Deposit',
    'New Balance',
    'QR Receive',
  ];
  const neutralizeSelfActions: TransactionAction[] = ['Withdrawal', 'Send', 'Payment'];

  if (isSelfDirected && neutralizeSelfActions.includes(type)) {
    // Self-directed payouts (sender === receiver) should not create a duplicate negative entry.
    return null;
  }

  // Map inbound/outbound similar to web filters; fall back to commitment-based logic when needed.
  const inboundActions = new Set<number>([0, 2, 3, 4, 5]);
  const outboundActions = new Set<number>([6, 7, 9]);

  let direction: 'send' | 'receive' | 'other' = 'other';
  if (inboundActions.has(action) || (action === 8 && !!toCommitment)) {
    direction = 'receive';
  } else if (outboundActions.has(action) || (action === 8 && !!fromCommitment)) {
    direction = 'send';
  } else if (normalizedCommitment) {
    if (toCommitment && toCommitment === normalizedCommitment) direction = 'receive';
    else if (fromCommitment && fromCommitment === normalizedCommitment) direction = 'send';
  }

  if (direction === 'other') {
    direction = positiveTypes.includes(type) ? 'receive' : 'send';
  }

  const isPositive = direction !== 'send';
  const tokenDecimals = Utils.getTokenDecimals(raw.token);
  const amountUsd = Utils.formatMicroToUsd(
    amountMicro,
    undefined,
    { grouping: true, empty: '0.00' },
    tokenDecimals
  );
  const formattedAmount = `${isPositive ? '+' : '-'} $${amountUsd}`;
  const amount = (() => {
    const numeric = Number(amountUsd.replace(/,/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  })();

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
          hour12: true,
        }).format(date)
      : '-';

  const txHash = raw.txHash ?? raw.tx_hash ?? '';
  const shortHash =
    txHash && txHash.length > 14 ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : txHash;

  return {
    actionCode: action,
    addr: raw.addr ?? '',
    amountRaw: amountMicroRaw,
    fromCommitment: raw.fromCommitment ?? raw.from_commitment ?? '',
    toCommitment: raw.toCommitment ?? raw.to_commitment ?? '',
    token: raw.token ?? '',
    txHash,
    lockboxCommitment: raw.lockboxCommitment ?? raw.lockbox_commitment ?? '',
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
