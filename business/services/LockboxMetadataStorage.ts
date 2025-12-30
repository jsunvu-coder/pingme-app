import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_URL } from 'business/Config';

export type LockboxMetadata = {
  lockboxSalt: string;
  passphrase: string;
  recipient_email: string;
  updatedAtMs: number;
};

type LockboxMetadataMap = Record<string, LockboxMetadata>;

const STORAGE_PREFIX = 'lockbox_metadata_v1:';

function normalizeEmail(email?: string | null): string {
  return (email ?? '').toString().trim().toLowerCase();
}

function storageKeyForUser(userEmail?: string | null): string {
  const normalized = normalizeEmail(userEmail) || 'unknown';
  return `${STORAGE_PREFIX}${normalized}`;
}

function safeParseMap(raw: string | null): LockboxMetadataMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as LockboxMetadataMap;
  } catch {
    return {};
  }
}

export function buildPayLink(lockboxSalt: string, recipientEmail?: string): string {
  const base = new URL('/claim', APP_URL);
  base.searchParams.set('lockboxSalt', lockboxSalt);
  const normalizedRecipient = normalizeEmail(recipientEmail);
  if (normalizedRecipient) base.searchParams.set('username', normalizedRecipient);
  return base.toString();
}

export const LockboxMetadataStorage = {
  async get(userEmail: string, lockboxCommitment: string): Promise<LockboxMetadata | null> {
    const key = storageKeyForUser(userEmail);
    const raw = await AsyncStorage.getItem(key);
    const map = safeParseMap(raw);
    return map[lockboxCommitment] ?? null;
  },

  async upsert(
    userEmail: string,
    lockboxCommitment: string,
    payload: Omit<LockboxMetadata, 'updatedAtMs'>
  ): Promise<void> {
    const key = storageKeyForUser(userEmail);
    const raw = await AsyncStorage.getItem(key);
    const map = safeParseMap(raw);

    map[lockboxCommitment] = {
      ...payload,
      updatedAtMs: Date.now(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(map));
  },
};

