import { APP_URL } from 'business/Config';
import { push } from 'navigation/Navigation';
import { Alert } from 'react-native';

/**
 * Universal deep link and QR handler for PingMe app.
 * Supports:
 *  - https://app.pingme.xyz/claim?lockboxSalt=0x...
 *  - https://app.pingme.xyz/pay?token=...&amount=...&requester=...
 */
export const handleUrl = (data: string) => {
  try {
    if (!data) {
      console.warn('⚠️ No data provided to handleUrl');
      return;
    }

    console.log('🔍 [handleUrl] Incoming URL:', data);

    // Ensure URL starts with the configured base
    if (!data?.startsWith(APP_URL)) {
      console.warn('❌ Unsupported URL:', data);
      Alert.alert('Oops', 'The provided URL is not supported');
      return;
    }

    const url = new URL(data);
    const path = url.pathname; // e.g. "/claim" or "/pay"

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

    // ---------- Handle /pay ----------
    if (path === '/pay') {
      const token = url.searchParams.get('token');
      const amount = url.searchParams.get('amount');
      const requester = url.searchParams.get('requester');

      if (!token || !amount || !requester) {
        console.warn('⚠️ Missing params in pay URL', { token, amount, requester });
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
