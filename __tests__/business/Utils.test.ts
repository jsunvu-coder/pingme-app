import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Utils } from 'business/Utils';
import { BalanceEntry, RecordEntry } from 'business/Types';

describe('Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Storage - Strings', () => {
    it('should get session string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-value');

      const result = await Utils.getSessionString('test-key');

      expect(result).toBe('test-value');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return null on error when getting session string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await Utils.getSessionString('test-key');

      expect(result).toBeNull();
    });

    it('should set session string', async () => {
      await Utils.setSessionString('test-key', 'test-value');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should handle error when setting session string', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(Utils.setSessionString('test-key', 'test-value')).resolves.not.toThrow();
    });
  });

  describe('Session Storage - Objects', () => {
    it('should set session object', async () => {
      const obj = { foo: 'bar', num: 123 };

      await Utils.setSessionObject('test-key', obj);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(obj));
    });

    it('should handle error when setting session object', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(Utils.setSessionObject('test-key', {})).resolves.not.toThrow();
    });
  });

  describe('Session Storage - Numbers', () => {
    it('should get session number', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('42');

      const result = await Utils.getSessionNumber('test-key');

      expect(result).toBe(42);
    });

    it('should return 0 when session number is null', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await Utils.getSessionNumber('test-key');

      expect(result).toBe(0);
    });

    it('should return 0 on error when getting session number', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await Utils.getSessionNumber('test-key');

      expect(result).toBe(0);
    });

    it('should set session number', async () => {
      await Utils.setSessionNumber('test-key', 123);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', '123');
    });

    it('should handle error when setting session number', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(Utils.setSessionNumber('test-key', 123)).resolves.not.toThrow();
    });
  });

  describe('Clear Session', () => {
    it('should clear session', async () => {
      await Utils.clearSession('test-key');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle error when clearing session', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(Utils.clearSession('test-key')).resolves.not.toThrow();
    });
  });

  describe('Clipboard', () => {
    it('should copy to clipboard', async () => {
      await Utils.copyToClipboard('test text');

      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('test text');
    });

    it('should handle error when copying to clipboard', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      await expect(Utils.copyToClipboard('test')).resolves.not.toThrow();
    });
  });

  describe('filterBalance', () => {
    it('should sort balance entries by amount descending', () => {
      const balances: BalanceEntry[] = [
        { token: 'USDC', amount: '100', tokenAddress: '0x1' },
        { token: 'USDC', amount: '500', tokenAddress: '0x2' },
        { token: 'USDC', amount: '200', tokenAddress: '0x3' },
      ];

      const result = Utils.filterBalance(balances);

      expect(result[0].amount).toBe('500');
      expect(result[1].amount).toBe('200');
      expect(result[2].amount).toBe('100');
    });

    it('should handle equal amounts', () => {
      const balances: BalanceEntry[] = [
        { token: 'USDC', amount: '100', tokenAddress: '0x1' },
        { token: 'USDC', amount: '100', tokenAddress: '0x2' },
      ];

      const result = Utils.filterBalance(balances);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe('100');
      expect(result[1].amount).toBe('100');
    });

    it('should handle empty array', () => {
      const result = Utils.filterBalance([]);

      expect(result).toEqual([]);
    });
  });

  describe('filterPayRecords', () => {
    it('should categorize pay records correctly', () => {
      const records: RecordEntry[] = [
        {
          action: 9,
          lockboxCommitment: '0x1',
          fromCommitment: '',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '100',
          timestamp: 1000,
        },
        {
          action: 0,
          lockboxCommitment: '0x2',
          fromCommitment: '0xfrom',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '50',
          timestamp: 2000,
        },
        {
          action: 5,
          lockboxCommitment: '0x3',
          fromCommitment: '',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '75',
          timestamp: 3000,
        },
      ];

      const result = Utils.filterPayRecords(records);

      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].lockboxCommitment).toBe('0x1');
      expect(result.claimed.has('0x2')).toBe(true);
      expect(result.reclaimed.has('0x3')).toBe(true);
    });

    it('should handle empty records', () => {
      const result = Utils.filterPayRecords([]);

      expect(result.sent).toEqual([]);
      expect(result.claimed.size).toBe(0);
      expect(result.reclaimed.size).toBe(0);
    });

    it('should handle multiple sent records', () => {
      const records: RecordEntry[] = [
        {
          action: 9,
          lockboxCommitment: '0x1',
          fromCommitment: '',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '100',
          timestamp: 1000,
        },
        {
          action: 9,
          lockboxCommitment: '0x2',
          fromCommitment: '',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '200',
          timestamp: 2000,
        },
      ];

      const result = Utils.filterPayRecords(records);

      expect(result.sent).toHaveLength(2);
    });
  });

  describe('filterTrxRecords', () => {
    it('should filter transaction records', () => {
      const records: RecordEntry[] = [
        {
          action: 0,
          lockboxCommitment: '0x1',
          fromCommitment: '',
          toCommitment: '0xto',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '100',
          timestamp: 1000,
        },
        {
          action: 2,
          lockboxCommitment: '0x2',
          fromCommitment: '',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '200',
          timestamp: 2000,
        },
        {
          action: 0,
          lockboxCommitment: '0x3',
          fromCommitment: '0xfrom',
          toCommitment: '',
          token: 'USDC',
          tokenAddress: '0xtoken',
          amount: '50',
          timestamp: 3000,
        },
      ];

      const result = Utils.filterTrxRecords(records);

      expect(result).toHaveLength(2);
      expect(result[0].lockboxCommitment).toBe('0x1');
      expect(result[1].lockboxCommitment).toBe('0x2');
    });

    it('should handle empty records', () => {
      const result = Utils.filterTrxRecords([]);

      expect(result).toEqual([]);
    });
  });

  describe('validateCredential', () => {
    it('should return no errors for valid credentials', () => {
      const errors = Utils.validateCredential('test@example.com', 'password123', 'password123');

      expect(errors).toEqual([]);
    });

    it('should return INVALID_EMAIL for invalid email', () => {
      const errors = Utils.validateCredential('invalid-email', 'password123', 'password123');

      expect(errors).toContain('INVALID_EMAIL');
    });

    it('should return PASSWORDS_MISMATCH for non-matching passwords', () => {
      const errors = Utils.validateCredential('test@example.com', 'password123', 'different');

      expect(errors).toContain('PASSWORDS_MISMATCH');
    });

    it('should return PASSWORD_TOO_SHORT for short password', () => {
      const errors = Utils.validateCredential('test@example.com', '123', '123');

      expect(errors).toContain('PASSWORD_TOO_SHORT');
    });

    it('should return multiple errors', () => {
      const errors = Utils.validateCredential('invalid', '123', 'abc');

      expect(errors).toContain('INVALID_EMAIL');
      expect(errors).toContain('PASSWORDS_MISMATCH');
      expect(errors).toContain('PASSWORD_TOO_SHORT');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(Utils.isValidEmail('test@example.com')).toBe(true);
      expect(Utils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(Utils.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(Utils.isValidEmail('invalid')).toBe(false);
      expect(Utils.isValidEmail('@example.com')).toBe(false);
      expect(Utils.isValidEmail('user@')).toBe(false);
      expect(Utils.isValidEmail('user @example.com')).toBe(false);
      expect(Utils.isValidEmail('')).toBe(false);
    });
  });
});
