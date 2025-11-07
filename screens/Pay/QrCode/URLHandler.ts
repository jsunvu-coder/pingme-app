import { APP_URL } from 'business/Config';
import { push } from 'navigation/Navigation';
import { Alert } from 'react-native';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { parseDepositLink } from 'screens/Home/Deposit/hooks/useDepositFlow';

/**
 * Universal deep link and QR handler for PingMe app.
 * Supports:
 *  - https://app.pingme.xyz/claim?lockboxSalt=0x...
 *  - https://app.pingme.xyz/send?token=...&amount=...&requester=...
 *  - https://app.pingme.xyz/deposit?commitment=...
 */
export const handleUrl = (rawData: string) => {
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
      Alert.alert('Oops', 'The provided URL is not supported');
      return;
    }

    const url = new URL(decodedData);
    const path = url.pathname; // e.g. "/claim" or "/send"

    // ---------- Handle /claim ----------
    if (path === '/claim') {
      const lockboxSalt = url.searchParams.get('lockboxSalt');
      if (!lockboxSalt) {
        console.warn('⚠️ Missing lockboxSalt in claim URL');
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
        void showLocalizedAlert({
          title: 'Oops',
          message: errorKey ?? '_ALERT_INVALID_QR_CODE',
        });
        return;
      }

      console.log('🏦 Navigating to PayQrScreen (deposit mode):', payload);
      push('PayQrScreen', { mode: 'deposit', depositPayload: payload });
      return;
    }

    // ---------- Handle /send ----------
    if (path.startsWith('/send')) {
      const token = url.searchParams.get('token');
      let amount = url.searchParams.get('amount');
      let requester = url.searchParams.get('requester') ?? url.searchParams.get('email');

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
        if (amount) {
          const numericAmount = Number(amount);
          if (Number.isFinite(numericAmount)) {
            fallbackParams.amount = numericAmount;
          }
        }

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
        amount: Number(amount),
        displayAmount: `$${Number(amount).toFixed(2)}`,
        recipient: requester,
        channel: 'Email',
      });
      return;
    }

    console.warn('⚠️ Unrecognized URL path:', path);
  } catch (err) {
    console.error('❌ [handleUrl] Failed to handle URL:', err);
  }
};
