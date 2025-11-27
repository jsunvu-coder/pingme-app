import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecentEmailStorage } from 'screens/Send/PingMe/RecentEmailStorage';

describe('RecentEmailStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    it('should return empty array when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await RecentEmailStorage.load();

      expect(result).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('recent_emails');
    });

    it('should return parsed emails from storage', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(emails));

      const result = await RecentEmailStorage.load();

      expect(result).toEqual(emails);
    });

    it('should return empty array on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await RecentEmailStorage.load();

      expect(result).toEqual([]);
    });

    it('should return empty array on storage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await RecentEmailStorage.load();

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should save new email to empty list', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await RecentEmailStorage.save('new@example.com');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_emails',
        JSON.stringify(['new@example.com'])
      );
    });

    it('should add new email to top of existing list', async () => {
      const existing = ['old@example.com'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await RecentEmailStorage.save('new@example.com');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_emails',
        JSON.stringify(['new@example.com', 'old@example.com'])
      );
    });

    it('should remove duplicate emails (case insensitive)', async () => {
      const existing = ['old@example.com', 'another@example.com'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await RecentEmailStorage.save('OLD@example.com');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_emails',
        JSON.stringify(['OLD@example.com', 'another@example.com'])
      );
    });

    it('should keep maximum 10 emails', async () => {
      const existing = Array.from({ length: 10 }, (_, i) => `email${i}@example.com`);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await RecentEmailStorage.save('new@example.com');

      const saved = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(saved).toHaveLength(10);
      expect(saved[0]).toBe('new@example.com');
      expect(saved).not.toContain('email9@example.com');
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(RecentEmailStorage.save('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove recent_emails from storage', async () => {
      await RecentEmailStorage.clear();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recent_emails');
    });

    it('should handle removal errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(RecentEmailStorage.clear()).resolves.not.toThrow();
    });
  });
});
