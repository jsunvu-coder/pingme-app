import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_URL } from 'business/Config';

export type LockboxMetadata = {
  lockboxSalt: string;
  passphrase: string;
  recipient_email: string;
  updatedAtMs: number;
};

type LockboxMetadataMap = Record<string, LockboxMetadata>;

export const LOCKBOX_METADATA_STORAGE_PREFIX = 'lockbox_metadata_v1:';
const STORAGE_PREFIX = LOCKBOX_METADATA_STORAGE_PREFIX;
const GLOBAL_STORAGE_KEY = `${STORAGE_PREFIX}global`;

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
    // Device-global storage so metadata survives logout and user switches.
    const rawGlobal = await AsyncStorage.getItem(GLOBAL_STORAGE_KEY);
    const globalMap = safeParseMap(rawGlobal);
    const fromGlobal = globalMap[lockboxCommitment];
    if (fromGlobal) return fromGlobal;

    // Backward-compatible read: older builds stored per-user.
    const legacyKey = storageKeyForUser(userEmail);
    const rawLegacy = await AsyncStorage.getItem(legacyKey);
    const legacyMap = safeParseMap(rawLegacy);
    const fromLegacy = legacyMap[lockboxCommitment] ?? null;
    if (!fromLegacy) return null;

    // Migrate to global for future lookups.
    await AsyncStorage.setItem(
      GLOBAL_STORAGE_KEY,
      JSON.stringify({
        ...globalMap,
        [lockboxCommitment]: fromLegacy,
      })
    );

    return fromLegacy;
  },

  async upsert(
    userEmail: string,
    lockboxCommitment: string,
    payload: Omit<LockboxMetadata, 'updatedAtMs'>
  ): Promise<void> {
    void userEmail;
    const raw = await AsyncStorage.getItem(GLOBAL_STORAGE_KEY);
    const map = safeParseMap(raw);

    map[lockboxCommitment] = {
      ...payload,
      updatedAtMs: Date.now(),
    };

    await AsyncStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(map));
  },
};
