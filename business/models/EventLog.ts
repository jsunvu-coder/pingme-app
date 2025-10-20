// Base structure returned from backend or blockchain
export interface EventLog {
  action: number;
  addr: string;
  amount: string;
  blockNumber: number;
  duration: number;
  fromCommitment?: string;
  toCommitment?: string;
  lockboxCommitment: string;
  timestamp: number;
  token: string;
  txHash: string;

  amountNumber?: number;
  direction?: 'sent' | 'received' | 'other';

  readableTime?: string;
  displayLabel?: string;
  amountDisplay?: string;
  color?: string;
  iconName?: string;
  iconColor?: string;
}

// Response container from API
export interface EventResponse {
  commitment: string;
  events: EventLog[];
}
