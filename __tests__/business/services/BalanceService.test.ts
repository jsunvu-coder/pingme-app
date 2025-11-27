import { BalanceService } from 'business/services/BalanceService';
import { ContractService } from 'business/services/ContractService';
import { BalanceEntry } from 'business/Types';

jest.mock('business/services/ContractService');

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let mockContractService: jest.Mocked<ContractService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (BalanceService as any).instance = undefined;

    mockContractService = {
      getCrypto: jest.fn(),
      getBalance: jest.fn(),
    } as any;

    (ContractService.getInstance as jest.Mock).mockReturnValue(mockContractService);

    balanceService = BalanceService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BalanceService.getInstance();
      const instance2 = BalanceService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Balance Listeners', () => {
    it('should add balance listener', () => {
      const listener = jest.fn();

      balanceService.onBalanceChange(listener);

      // Trigger notification
      balanceService.clear();

      expect(listener).toHaveBeenCalledWith([]);
    });

    it('should remove balance listener', () => {
      const listener = jest.fn();

      balanceService.onBalanceChange(listener);
      balanceService.offBalanceChange(listener);
      balanceService.clear();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify all balance listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      balanceService.onBalanceChange(listener1);
      balanceService.onBalanceChange(listener2);
      balanceService.clear();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Update Time Listeners', () => {
    it('should add update time listener', () => {
      const listener = jest.fn();

      balanceService.onUpdateTimeChange(listener);
      balanceService.clear();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should remove update time listener', () => {
      const listener = jest.fn();

      balanceService.onUpdateTimeChange(listener);
      balanceService.offUpdateTimeChange(listener);
      balanceService.clear();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Getters', () => {
    it('should get current balances', () => {
      expect(balanceService.currentBalances).toEqual([]);
    });

    it('should get current update time', () => {
      expect(balanceService.currentUpdateTime).toBeNull();
    });

    it('should get total balance', () => {
      expect(balanceService.totalBalance).toBe('0.00');
    });
  });

  describe('getBalance', () => {
    it('should fetch and update balances', async () => {
      const mockBalances: BalanceEntry[] = [
        { token: 'USDC', amount: '1000000', tokenAddress: '0x1' },
        { token: 'USDC', amount: '2000000', tokenAddress: '0x2' },
      ];

      mockContractService.getCrypto.mockReturnValue({ commitment: '0xcommit' });
      mockContractService.getBalance.mockResolvedValue({
        amounts: mockBalances,
        update_time: 1234567890,
      });

      const listener = jest.fn();
      balanceService.onBalanceChange(listener);

      await balanceService.getBalance();

      expect(balanceService.currentBalances).toHaveLength(2);
      expect(balanceService.currentUpdateTime).toBe(1234567890);
      expect(balanceService.totalBalance).toBe('3.00');
      expect(listener).toHaveBeenCalled();
    });

    it('should handle getBalance errors gracefully', async () => {
      mockContractService.getCrypto.mockReturnValue({ commitment: '0xcommit' });
      mockContractService.getBalance.mockRejectedValue(new Error('Network error'));

      await balanceService.getBalance();

      expect(balanceService.currentBalances).toEqual([]);
      expect(balanceService.currentUpdateTime).toBeNull();
    });

    it('should not fetch if mutex is locked', async () => {
      (balanceService as any)._mutex = true;

      await balanceService.getBalance();

      expect(mockContractService.getBalance).not.toHaveBeenCalled();
    });

    it('should compute total balance correctly', async () => {
      const mockBalances: BalanceEntry[] = [
        { token: 'USDC', amount: '1500000', tokenAddress: '0x1' }, // 1.50
        { token: 'USDC', amount: '2500000', tokenAddress: '0x2' }, // 2.50
      ];

      mockContractService.getCrypto.mockReturnValue({ commitment: '0xcommit' });
      mockContractService.getBalance.mockResolvedValue({
        amounts: mockBalances,
        update_time: 1234567890,
      });

      await balanceService.getBalance();

      expect(balanceService.totalBalance).toBe('4.00');
    });

    it('should handle zero balance', async () => {
      const mockBalances: BalanceEntry[] = [
        { token: 'USDC', amount: '0', tokenAddress: '0x1' },
      ];

      mockContractService.getCrypto.mockReturnValue({ commitment: '0xcommit' });
      mockContractService.getBalance.mockResolvedValue({
        amounts: mockBalances,
        update_time: 1234567890,
      });

      await balanceService.getBalance();

      expect(balanceService.totalBalance).toBe('0.00');
    });
  });

  describe('clear', () => {
    it('should clear all balances and state', () => {
      const balanceListener = jest.fn();
      const timeListener = jest.fn();

      balanceService.onBalanceChange(balanceListener);
      balanceService.onUpdateTimeChange(timeListener);

      balanceService.clear();

      expect(balanceService.currentBalances).toEqual([]);
      expect(balanceService.currentUpdateTime).toBeNull();
      expect(balanceService.totalBalance).toBe('0.00');
      expect(balanceListener).toHaveBeenCalledWith([]);
      expect(timeListener).toHaveBeenCalledWith(null);
    });
  });
});
