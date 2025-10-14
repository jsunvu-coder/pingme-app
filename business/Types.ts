export interface BalanceEntry {
  amount: string;
  token: string;
};

export interface RecordEntry {
  action: number;
  fromCommitment: string;
  toCommitment: string;
  lockboxCommitment: string;
  addr: string;
  token: string;
  amount: string;
  timestamp: string;
  duration: number;
  txHash: string;
  blockNumber: string;
};

export interface FilteredRecordsResult {
  filteredRecords: RecordEntry[];
  lockboxCommitments: Set<string>;
}
