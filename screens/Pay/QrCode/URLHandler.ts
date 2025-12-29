import { APP_URL } from 'business/Config';
import { Utils } from 'business/Utils';
import { push } from 'navigation/Navigation';
import { t } from 'i18n';
import { showFlashMessage } from 'utils/flashMessage';
import { parseDepositLink } from 'screens/Home/Deposit/hooks/useDepositFlow';

/**
 * Universal deep link and QR handler for PingMe app.
 * Supports:
 *  - https://app.pingme.xyz/claim?lockboxSalt=0x...
 *  - https://app.pingme.xyz/send?token=...&amount=...&requester=...
 *  - https://app.pingme.xyz/deposit?commitment=...
 */
export const handleUrl = (rawData: string, releaseScanLock?: () => void) => {
  const showError = ({
    title,
    message,
  }: {
    title: string;
    message: string;
  }) => {
    showFlashMessage({
      title,
      message,
      type: 'danger',
      onHide: releaseScanLock,
    });
  };

  try {
    if (!rawData) {
      console.warn('⚠️ No data provided to handleUrl');
      return;
    }

    // ✅ Decode if the string is encoded
    const decodedData = decodeURIComponent(rawData.trim());
    console.log('🔍 [handleUrl] Incoming URL (decoded):', decodedData);

    // ✅ Normalize and validate base URL
    if (!decodedData.startsWith(APP_URL)) {
      console.warn('❌ Unsupported URL base:', decodedData);
      showError({
        title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
        message: t('ALERT_UNSUPPORTED_QR', undefined, 'The provided QR code is not supported.'),
      });
      return;
    }

    const url = new URL(decodedData);
    const path = url.pathname; // e.g. "/claim" or "/send"

    // ---------- Handle /claim ----------
    if (path === '/claim') {
      const lockboxSalt = url.searchParams.get('lockboxSalt');
      if (!lockboxSalt) {
        console.warn('⚠️ Missing lockboxSalt in claim URL');
        showError({
          title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
          message: t('ALERT_INVALID_CLAIM_QR', undefined, 'Invalid claim QR code.'),
        });
        return;
      }

      console.log('📦 Navigating to ClaimPaymentScreen:', { lockboxSalt });
      push('ClaimPaymentScreen', { lockboxSalt });
      return;
    }

    // ---------- Handle /deposit ----------
    if (path.startsWith('/deposit')) {
      const { payload, errorKey } = parseDepositLink(decodedData);
      if (!payload) {
        showError({
          title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
          message: t(errorKey ?? '_ALERT_INVALID_QR_CODE', undefined, 'Invalid QR code.'),
        });
        return;
      }

      console.log('🏦 Navigating to PayQrConfirmationScreen (deposit mode):', payload);
      push('PayQrConfirmationScreen', { mode: 'deposit', depositPayload: payload });
      return;
    }

    // ---------- Handle /send ----------
    if (path.startsWith('/send')) {
      const token = url.searchParams.get('token');
      let amount = url.searchParams.get('amount');
      let requester = url.searchParams.get('requester') ?? url.searchParams.get('email');
      const normalizeAmountForInput = (raw?: string | null) => {
        const normalized = (raw ?? '').replace(/,/g, '').replace(/\$/g, '').trim();
        if (!normalized) return undefined;
        if (normalized.includes('.')) return normalized; // already USD decimal
        return Utils.formatMicroToUsd(normalized, undefined, { grouping: false, empty: '' }) || undefined;
      };

      // Try parsing from path if query params missing
      if (!requester) {
        const emailMatch = path.match(/\/send\/email=([^/]+)/);
        if (emailMatch?.[1]) requester = decodeURIComponent(emailMatch[1]);
      }
      if (!amount) {
        const amountMatch = path.match(/\/send\/amount=([^/]+)/);
        if (amountMatch?.[1]) amount = amountMatch[1];
      }

      if (!token || !amount || !requester) {
        console.warn('⚠️ Missing params in send URL', {
          token,
          amount,
          requester,
        });

        const fallbackParams: Record<string, unknown> = {
          mode: 'send',
          source: 'qr',
          timestamp: Date.now(),
        };

        if (requester) fallbackParams.email = requester;
        const amountUsd = normalizeAmountForInput(amount);
        if (amountUsd) fallbackParams.amount = amountUsd;

        push('MainTab', {
          screen: 'Ping Now',
          params: fallbackParams,
        });
        return;
      }

      console.log('💳 Navigating to SendConfirmationScreen:', {
        token,
        amount,
        requester,
      });

      push('SendConfirmationScreen', {
        amount,
        recipient: requester,
        channel: 'Email',
      });
      return;
    }

    console.warn('⚠️ Unrecognized URL path:', path);
  } catch (err) {
    console.error('❌ [handleUrl] Failed to handle URL:', err);
    showError({
      title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
      message: t('ALERT_INVALID_QR_CODE', undefined, 'Invalid QR code.'),
    });
  }
};
