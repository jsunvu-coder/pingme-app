import { PingHistoryViewModel } from 'screens/Home/History/List/PingHistoryViewModel';
import { RecordService } from 'business/services/RecordService';
import { ContractService } from 'business/services/ContractService';

jest.mock('business/services/RecordService');
jest.mock('business/services/ContractService');

const mockRecords = [
  {
    action: 3,
    fromCommitment: 'a',
    toCommitment: 'b',
    lockboxCommitment: '',
    addr: 'user',
    token: 'USDC',
    amount: '1000000',
    timestamp: '100',
    duration: 0,
    txHash: 'hash1',
    blockNumber: '1',
  },
  {
    action: 6,
    fromCommitment: 'a',
    toCommitment: 'c',
    lockboxCommitment: '',
    addr: 'user',
    token: 'USDC',
    amount: '500000',
    timestamp: '90',
    duration: 0,
    txHash: 'hash2',
    blockNumber: '2',
  },
];

describe('PingHistoryViewModel chunk loading', () => {
  const mockRecordService = RecordService as jest.MockedClass<typeof RecordService>;
  const mockContractService = ContractService as jest.MockedClass<typeof ContractService>;

  beforeEach(() => {
    jest.resetAllMocks();
    (mockContractService.getInstance as jest.Mock).mockReturnValue({
      getCrypto: () => ({ commitment: 'commit' }),
    } as any);

    (mockRecordService.getInstance as jest.Mock).mockReturnValue({
      getRecord: jest.fn().mockResolvedValue(mockRecords),
    } as any);
  });

  it('loads initial 5 then chunks of 8 and updates cache', async () => {
    const vm = new PingHistoryViewModel();
    const updates: any[] = [];

    await vm.getTransactions({
      onPhaseUpdate: (txs) => updates.push(txs.length),
      force: true,
    });

    // After hydration with only 2 records, cache should have those 2
    expect(updates[updates.length - 1]).toBe(2);

    const more = await vm.loadMoreChunks(1, 8);
    expect(more.length).toBe(2);
  });

  it('omits Claim actions for the sender and keeps recipient entry', async () => {
    const records = [
      {
        action: 0,
        fromCommitment: 'claimant',
        toCommitment: '',
        lockboxCommitment: '',
        addr: 'user',
        token: 'USDC',
        amount: '1000000',
        timestamp: '120',
        duration: 0,
        txHash: 'hash-claim-sender',
        blockNumber: '3',
      },
      {
        action: 0,
        fromCommitment: 'other',
        toCommitment: 'claimant',
        lockboxCommitment: '',
        addr: 'user',
        token: 'USDC',
        amount: '1000000',
        timestamp: '125',
        duration: 0,
        txHash: 'hash-claim-recipient',
        blockNumber: '4',
      },
    ];

    (mockContractService.getInstance as jest.Mock).mockReturnValue({
      getCrypto: () => ({ commitment: 'claimant' }),
    } as any);

    (mockRecordService.getInstance as jest.Mock).mockReturnValue({
      getRecord: jest.fn().mockResolvedValue(records),
    } as any);

    const vm = new PingHistoryViewModel();
    const txs = await vm.getTransactions({ force: true });

    expect(txs).toHaveLength(1);
    expect(txs[0].txHash).toBe('hash-claim-recipient');
    expect(txs[0].toCommitment.toLowerCase()).toBe('claimant');
  });

  it('keeps Claim when both toCommitment and fromCommitment match (recipient view)', async () => {
    const records = [
      {
        action: 0,
        fromCommitment: 'claimant-self',
        toCommitment: 'claimant-self',
        lockboxCommitment: '',
        addr: 'user',
        token: 'USDC',
        amount: '1000000',
        timestamp: '130',
        duration: 0,
        txHash: 'hash-claim-self',
        blockNumber: '5',
      },
    ];

    (mockContractService.getInstance as jest.Mock).mockReturnValue({
      getCrypto: () => ({ commitment: 'claimant-self' }),
    } as any);

    (mockRecordService.getInstance as jest.Mock).mockReturnValue({
      getRecord: jest.fn().mockResolvedValue(records),
    } as any);

    const vm = new PingHistoryViewModel();
    const txs = await vm.getTransactions({ force: true });

    expect(txs).toHaveLength(1);
    expect(txs[0].txHash).toBe('hash-claim-self');
  });

  it('drops Claim when a Payment exists for the same lockbox', async () => {
    const records = [
      {
        action: 9,
        fromCommitment: 'payer',
        toCommitment: 'payee',
        lockboxCommitment: 'lockbox-1',
        addr: 'user',
        token: 'USDC',
        amount: '2000000',
        timestamp: '140',
        duration: 0,
        txHash: 'hash-payment',
        blockNumber: '6',
      },
      {
        action: 0,
        fromCommitment: 'payer',
        toCommitment: 'payee',
        lockboxCommitment: 'lockbox-1',
        addr: 'user',
        token: 'USDC',
        amount: '2000000',
        timestamp: '145',
        duration: 0,
        txHash: 'hash-claim',
        blockNumber: '7',
      },
    ];

    (mockContractService.getInstance as jest.Mock).mockReturnValue({
      getCrypto: () => ({ commitment: 'payee' }),
    } as any);

    (mockRecordService.getInstance as jest.Mock).mockReturnValue({
      getRecord: jest.fn().mockResolvedValue(records),
    } as any);

    const vm = new PingHistoryViewModel();
    const txs = await vm.getTransactions({ force: true });

    expect(txs).toHaveLength(1);
    expect(txs[0].txHash).toBe('hash-payment');
    expect(txs[0].lockboxCommitment).toBe('lockbox-1');
  });

  it('keeps lone Claim when no Payment exists for its lockbox', async () => {
    const records = [
      {
        action: 0,
        fromCommitment: '',
        toCommitment: 'recipient',
        lockboxCommitment: 'lockbox-solo',
        addr: 'user',
        token: 'USDC',
        amount: '3000000',
        timestamp: '150',
        duration: 0,
        txHash: 'hash-claim-solo',
        blockNumber: '8',
      },
    ];

    (mockContractService.getInstance as jest.Mock).mockReturnValue({
      getCrypto: () => ({ commitment: 'recipient' }),
    } as any);

    (mockRecordService.getInstance as jest.Mock).mockReturnValue({
      getRecord: jest.fn().mockResolvedValue(records),
    } as any);

    const vm = new PingHistoryViewModel();
    const txs = await vm.getTransactions({ force: true });

    expect(txs).toHaveLength(1);
    expect(txs[0].txHash).toBe('hash-claim-solo');
    expect(txs[0].lockboxCommitment).toBe('lockbox-solo');
  });
});
