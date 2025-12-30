import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPayLink, LockboxMetadataStorage } from 'business/services/LockboxMetadataStorage';

describe('LockboxMetadataStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildPayLink includes lockboxSalt and username when provided', () => {
    const url = buildPayLink('0x' + '11'.repeat(32), 'Alice@Example.com');
    expect(url).toContain('/claim?');
    expect(url).toContain('lockboxSalt=');
    expect(url).toContain('username=alice%40example.com');
  });

  it('upsert merges into the stored dictionary', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        '0xaaa': {
          lockboxSalt: '0x' + '22'.repeat(32),
          passphrase: 'old',
          recipient_email: 'old@example.com',
          updatedAtMs: 1,
        },
      })
    );

    await LockboxMetadataStorage.upsert('sender@example.com', '0xbbb', {
      lockboxSalt: '0x' + '33'.repeat(32),
      passphrase: 'new',
      recipient_email: 'new@example.com',
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, written] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const parsed = JSON.parse(written);
    expect(parsed['0xaaa']).toBeTruthy();
    expect(parsed['0xbbb']).toMatchObject({
      lockboxSalt: '0x' + '33'.repeat(32),
      passphrase: 'new',
      recipient_email: 'new@example.com',
    });
  });
});

