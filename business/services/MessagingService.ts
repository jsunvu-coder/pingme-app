import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountSecureKey, accountDataKey, notificationHandledKey } from 'business/Constants';
import { CryptoUtils } from 'business/CryptoUtils';
import { ContractService } from './ContractService';
import { AccountDataService } from './AccountDataService';
import { store } from 'store';
import { setNotificationCount } from 'store/notificationSlice';

/**
 * PingMe Encrypted Messaging (see `encrypted_messaging_api KCv1.html`).
 *
 * Crypto envelope produced server-side and unwrapped here:
 *   - X25519 ephemeral pubkey (ct_kem) + recipient private key → shared secret
 *   - HKDF-SHA256(shared_secret, salt="", info="pingme-msg-v1") → 32-byte AES key
 *   - AES-GCM-256 decrypt(ct, tag, nonce) with AAD = enc_key_ref + "|" + version
 *
 * Plaintext is an HTML blob equivalent to the email body (request / received).
 */

export type EncryptedMessage = {
  version: number;
  enc_key_ref: string;
  ct_kem: string;
  ct: string;
  tag: string;
  nonce: string;
};

export type EncMsgEnvelope = {
  id: number;
  enc_msg: EncryptedMessage;
  created_at: string;
  expired_at: string;
};

export type NotificationType = 'received' | 'requested' | 'unknown';

export type DecryptedNotification = {
  id: number;
  type: NotificationType;
  amountUsd: string | null;
  senderEmail: string | null;
  tokenName: string | null;
  customMessage: string | null;
  /**
   * Deep link extracted from the payload (JSON `pay_link` or first <a href>
   * for legacy HTML messages). Universal-link domains
   * (`https://app.(staging.)?pingme.xyz/...`) are rewritten to the `pingme://`
   * custom scheme so the in-app LinkingService picks it up directly without
   * hitting the browser.
   */
  actionUrl: string | null;
  /**
   * true when this notification has been marked handled (user tapped it /
   * completed the claim or pay action). Persisted locally by id per email.
   */
  isHandled: boolean;
  html: string;
  createdAt: Date;
  expiredAt: Date;
};

/** Rewrite PingMe universal link → custom-scheme deep link. */
function toDeepLink(raw: string): string {
  return raw.replace(/^https:\/\/app\.(staging\.)?pingme\.xyz\//i, 'pingme://');
}

export class MessagingService {
  private static instance: MessagingService;

  static getInstance(): MessagingService {
    if (!MessagingService.instance) MessagingService.instance = new MessagingService();
    return MessagingService.instance;
  }

  /**
   * Load the locally-stored decryption keys for `email`.
   * Returns null when keys are missing (user must GENERATE NEW KEY first).
   */
  private async loadKeysForEmail(
    email: string
  ): Promise<{ privKey: Uint8Array; encKeyRef: string } | null> {
    const normalized = email.trim().toLowerCase();
    const [privHex, encKeyRef] = await Promise.all([
      SecureStore.getItemAsync(accountSecureKey(normalized, 'messaging_private_key')),
      AsyncStorage.getItem(accountDataKey(normalized, 'enc_key_ref')),
    ]);
    if (!privHex || !encKeyRef) return null;
    return { privKey: CryptoUtils.hexToBytes(privHex), encKeyRef };
  }

  /**
   * Decrypt a single enc_msg bundle. Returns null on failure (wrong key,
   * malformed envelope, etc.) so the caller can render a "cannot decrypt"
   * placeholder per spec.
   */
  /**
   * Mirrors `MessagingCrypto.decryptBundle` in `pingme/msg/js/messaging-client.js`
   * (reference implementation). Any divergence here means GCM auth tag fails.
   *
   *   shared = x25519(priv, ct_kem)
   *   aesKey = HKDF-SHA256(ikm=shared, salt=b"pingme-enc-msg-salt-v1", info=b"pingme-enc-msg-v1")
   *   aad    = utf8(JSON.stringify({ enc_key_ref, version }))
   *   pt     = AES-GCM-256-decrypt(aesKey, iv=nonce, ct|tag, aad)
   */
  private async decryptBundle(
    privKey: Uint8Array,
    enc: EncryptedMessage
  ): Promise<string | null> {
    try {
      const ctKem = CryptoUtils.hexToBytes(enc.ct_kem);
      const ct = CryptoUtils.hexToBytes(enc.ct);
      const tag = CryptoUtils.hexToBytes(enc.tag);
      const nonce = CryptoUtils.hexToBytes(enc.nonce);

      const shared = CryptoUtils.x25519Shared(privKey, ctKem);
      const salt = new TextEncoder().encode('pingme-enc-msg-salt-v1');
      const info = new TextEncoder().encode('pingme-enc-msg-v1');
      const aesKey = await CryptoUtils.hkdf32(shared, salt, info);

      const aad = new TextEncoder().encode(
        JSON.stringify({ enc_key_ref: enc.enc_key_ref, version: enc.version })
      );

      const plaintext = await CryptoUtils.aesGcmDecrypt256(aesKey, ct, tag, nonce, aad);
      return new TextDecoder().decode(plaintext);
    } catch (err) {
      console.warn('[MessagingService] decrypt failed', err);
      return null;
    }
  }

  /**
   * Extract the minimal fields the Notifications UI needs from the decrypted
   * payload. New BE format is `JSON.dumps({ type, sender, token_name,
   * usd_amount, days, pay_link, custom_message, created_at })`. Older messages
   * are still HTML — fall back to best-effort regex parsing in that case.
   */
  private parsePayload(payload: string): {
    type: NotificationType;
    amountUsd: string | null;
    senderEmail: string | null;
    tokenName: string | null;
    customMessage: string | null;
    actionUrl: string | null;
  } {
    const trimmed = payload.trimStart();
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const rawType = typeof obj.type === 'string' ? obj.type.toLowerCase() : '';
        const type: NotificationType =
          rawType === 'received' || rawType === 'requested'
            ? (rawType as NotificationType)
            : 'unknown';

        const sender = typeof obj.sender === 'string' ? obj.sender : null;
        const tokenName = typeof obj.token_name === 'string' ? obj.token_name : null;
        const customMessageRaw =
          typeof obj.custom_message === 'string' ? obj.custom_message.trim() : '';
        const customMessage = customMessageRaw.length > 0 ? customMessageRaw : null;

        const usdRaw = obj.usd_amount;
        let amountUsd: string | null = null;
        if (typeof usdRaw === 'number' && Number.isFinite(usdRaw)) {
          amountUsd = `$${usdRaw.toFixed(2)}`;
        } else if (typeof usdRaw === 'string' && usdRaw.trim().length > 0) {
          const cleaned = usdRaw.replace(/[$,\s]/g, '');
          const num = Number(cleaned);
          amountUsd = Number.isFinite(num) ? `$${num.toFixed(2)}` : `$${usdRaw}`;
        }

        const payLink = typeof obj.pay_link === 'string' ? obj.pay_link : null;
        const actionUrl = payLink ? toDeepLink(payLink) : null;

        return { type, amountUsd, senderEmail: sender, tokenName, customMessage, actionUrl };
      } catch (err) {
        console.warn('[MessagingService] JSON parse failed, falling back to HTML', err);
      }
    }

    // Legacy HTML payload — keep best-effort regex parsing.
    const hrefMatch = payload.match(/<a\b[^>]*\bhref=["']([^"']+)["']/i);
    const actionUrl = hrefMatch ? toDeepLink(hrefMatch[1]) : null;

    const stripped = payload.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const lower = stripped.toLowerCase();

    let type: NotificationType = 'unknown';
    if (/request/.test(lower)) type = 'requested';
    else if (/receiv|sent you|you received/.test(lower)) type = 'received';

    const amountMatch = stripped.match(/\$\s*([\d]+(?:,\d{3})*(?:\.\d+)?)/);
    const amountUsd = amountMatch ? `$${amountMatch[1]}` : null;

    const emailMatch = stripped.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const senderEmail = emailMatch ? emailMatch[0] : null;

    return {
      type,
      amountUsd,
      senderEmail,
      tokenName: null,
      customMessage: null,
      actionUrl,
    };
  }

  /**
   * Load the set of notification ids previously marked handled on this device
   * for the given email. Returns empty set on miss / parse error.
   */
  private async loadHandledIds(email: string): Promise<Set<number>> {
    try {
      const raw = await AsyncStorage.getItem(notificationHandledKey(email));
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? (arr as number[]) : []);
    } catch {
      return new Set();
    }
  }

  private async saveHandledIds(email: string, ids: Set<number>): Promise<void> {
    await AsyncStorage.setItem(notificationHandledKey(email), JSON.stringify([...ids]));
  }

  /** Mark one notification as handled for the given email. */
  async markHandled(email: string, id: number): Promise<void> {
    const ids = await this.loadHandledIds(email);
    if (ids.has(id)) return;
    ids.add(id);
    await this.saveHandledIds(email, ids);
  }

  /** Mark one notification as handled for the currently active account. */
  async markHandledActive(id: number): Promise<void> {
    const email = AccountDataService.getInstance().email;
    if (!email) return;
    await this.markHandled(email, id);
  }

  /**
   * Fetch + decrypt inbox for a given email. Messages that fail to decrypt
   * are returned as 'unknown' type with null fields so the UI can render a
   * "cannot decrypt message" row if desired.
   */
  async fetchNotifications(email: string): Promise<DecryptedNotification[]> {
    const keys = await this.loadKeysForEmail(email);
    if (!keys) return [];

    const { messages } = (await ContractService.getInstance().getEncMsgs(keys.encKeyRef)) as {
      messages?: EncMsgEnvelope[];
    };
    if (!messages || messages.length === 0) return [];

    const handledIds = await this.loadHandledIds(email);

    const decrypted = await Promise.all(
      messages.map(async (m) => {
        const payload = await this.decryptBundle(keys.privKey, m.enc_msg);
        const parsed = payload
          ? this.parsePayload(payload)
          : {
              type: 'unknown' as NotificationType,
              amountUsd: null,
              senderEmail: null,
              tokenName: null,
              customMessage: null,
              actionUrl: null,
            };
        return {
          id: m.id,
          type: parsed.type,
          amountUsd: parsed.amountUsd,
          senderEmail: parsed.senderEmail,
          tokenName: parsed.tokenName,
          customMessage: parsed.customMessage,
          actionUrl: parsed.actionUrl,
          isHandled: handledIds.has(m.id),
          html: payload ?? '',
          createdAt: new Date(m.created_at),
          expiredAt: new Date(m.expired_at),
        } satisfies DecryptedNotification;
      })
    );

    decrypted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return decrypted;
  }

  /**
   * Fetch + decrypt inbox and publish the UNHANDLED count to Redux so any
   * subscriber (e.g. Account menu badge) surfaces only the pending items.
   * Fire-and-forget friendly.
   */
  async refreshForEmail(email: string): Promise<DecryptedNotification[]> {
    try {
      const items = await this.fetchNotifications(email);
      const unhandled = items.filter((i) => !i.isHandled).length;
      store.dispatch(setNotificationCount(unhandled));
      return items;
    } catch (err) {
      console.warn('[MessagingService] refreshForEmail failed', err);
      return [];
    }
  }

  /**
   * Refresh the inbox for the currently active account (reads
   * AccountDataService). Fire-and-forget friendly.
   */
  async refreshActive(): Promise<void> {
    const email = AccountDataService.getInstance().email;
    if (!email) return;
    await this.refreshForEmail(email);
  }

  /**
   * Convenience entry point for push-notification handlers. Per spec:
   * "Triggers push notification (content-free) after encryption. Client polls
   * /pm_get_enc_msgs on push receipt".
   *
   * Wire-up example once `expo-notifications` (or similar) is installed:
   *   Notifications.addNotificationReceivedListener(() => {
   *     void MessagingService.getInstance().handleIncomingPush();
   *   });
   */
  async handleIncomingPush(): Promise<void> {
    await this.refreshActive();
  }
}
