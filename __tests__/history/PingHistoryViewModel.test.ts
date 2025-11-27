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
});
