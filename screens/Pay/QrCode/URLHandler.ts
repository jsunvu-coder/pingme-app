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
 *  - https://app.pingme.xyz/redPocket?bundle_uuid=<hex> (HongBao)
 *  - https://app.staging.pingme.xyz/... (for staging builds and production builds with both domains)
 */
export const handleUrl = async (rawData: string, releaseScanLock?: () => void) => {
  const showError = ({ title, message }: { title: string; message: string }) => {
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
    // Accept both production and staging URLs (production builds have both domains configured)
    const validBaseUrls = ['https://app.pingme.xyz', 'https://app.staging.pingme.xyz'];

    const isValidUrl = validBaseUrls.some((baseUrl) => decodedData.startsWith(baseUrl));

    if (!isValidUrl) {
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
      const username =
        url.searchParams.get('username') ?? url.searchParams.get('email') ?? undefined;
      if (!lockboxSalt) {
        console.warn('⚠️ Missing lockboxSalt in claim URL');
        showError({
          title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
          message: t('ALERT_INVALID_CLAIM_QR', undefined, 'Invalid claim QR code.'),
        });
        return;
      }

      console.log('📦 Navigating to ClaimPaymentScreen:', { lockboxSalt, username });
      push('ClaimPaymentScreen', { lockboxSalt, username });
      return;
    }

    // ---------- Handle /redPocket (HongBao) ----------
    if (path === '/redPocket') {
      const bundle_uuid = url.searchParams.get('bundle_uuid');
      if (!bundle_uuid) {
        console.warn('⚠️ Missing bundle_uuid in redPocket URL');
        showError({
          title: t('Unsupported QR code', undefined, 'Unsupported QR code'),
          message: t('ALERT_INVALID_HONGBAO_QR', undefined, 'Invalid HongBao QR code.'),
        });
        return;
      }

      // Check if user is logged in
      const { AuthService } = require('business/services/AuthService');
      const isLoggedIn = await AuthService.getInstance().isLoggedIn();

      if (isLoggedIn) {
        // Already logged in → skip auth screen, go directly to verification
        console.log('🧧 User logged in → Navigating to HongBaoVerificationScreen:', { bundle_uuid });
        push('HongBaoVerificationScreen', { bundle_uuid });
      } else {
        // Not logged in → show auth screen first
        console.log('🧧 User not logged in → Navigating to HongBaoWithAuthScreen:', { bundle_uuid });
        push('HongBaoWithAuthScreen', { bundle_uuid });
      }
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
        const tokenDecimals = Utils.getTokenDecimals(token ?? undefined);
        return (
          Utils.formatMicroToUsd(
            normalized,
            undefined,
            { grouping: false, empty: '' },
            tokenDecimals
          ) || undefined
        );
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
