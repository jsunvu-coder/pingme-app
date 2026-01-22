import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { Utils } from 'business/Utils';
import { shareFlowService } from 'business/services/ShareFlowService';
import { push } from 'navigation/Navigation';
import { showFlashMessage } from 'utils/flashMessage';

// Import utilities from utils/claim
import {
  computeLockboxProof,
  getLockbox,
  getLockboxInfo,
  getStatusDisplay,
  claimWithCurrentUser,
  isUserLoggedIn,
  validateLockboxSalt,
  type LockboxStatus,
  type LockboxData,
  type ClaimDeeplinkParams,
} from 'utils/claim';

// Re-export types for backward compatibility
export type { LockboxStatus, LockboxData };

export interface ClaimPaymentParams extends ClaimDeeplinkParams {
  // Already includes: username, lockboxSalt, code, paymentId, onClaimSuccess, signup
}

export const useClaimPayment = () => {
  const route = useRoute<any>();
  const params = useMemo(() => route?.params ?? {}, [route?.params]);
  const { username, lockboxSalt, code, paymentId, onClaimSuccess, signup, ...restParams } =
    params as ClaimPaymentParams;

  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockbox, setLockbox] = useState<LockboxData | null>(null);
  const [lockboxProof, setLockboxProof] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Validate deep link params using utility
  useEffect(() => {
    console.log('🔗 [ClaimPaymentScreen] Deep link params:', {
      username,
      lockboxSalt,
      code,
      paymentId,
      ...restParams,
    });

    const validation = validateLockboxSalt(lockboxSalt);
    if (!validation.isValid) {
      console.warn('⚠️ Invalid deep link for ClaimPaymentScreen:', validation.error);
    }
  }, [username, lockboxSalt, code, paymentId, restParams]);

  // Use utility to get lockbox info and status display
  const lockboxInfo = useMemo(() => getLockboxInfo(lockbox), [lockbox]);
  const statusDisplay = useMemo(() => {
    return lockboxInfo ? getStatusDisplay(lockboxInfo.derivedStatus) : null;
  }, [lockboxInfo]);

  // Derived values from utilities
  const derivedStatus = lockboxInfo?.derivedStatus ?? 'UNKNOWN';
  const statusColorClass = statusDisplay?.colorClass ?? 'text-neutral-600';
  const headerSubtitle = statusDisplay?.subtitle ?? '';

  // Format USD amount from lockbox using lockboxInfo
  const formatUsdFromLockbox = useCallback(() => {
    return lockboxInfo?.formattedAmount;
  }, [lockboxInfo]);

  const amountUsdStrFromLockbox = useCallback(
    (lb?: LockboxData | null) => {
      if (!lb) return undefined;
      const info = getLockboxInfo(lb);
      return info?.formattedAmount;
    },
    []
  );

  const handleClaim = useCallback(async () => {
    const proof = lockboxProof;
    if (!proof) {
      showFlashMessage({
        title: 'Claim failed',
        message: 'Missing lockbox proof. Please verify the passphrase again.',
        type: 'warning',
      });
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const amountUsdStr = amountUsdStrFromLockbox(lockbox);

      // Use utility to check login status
      const loggedIn = await isUserLoggedIn();
      if (!loggedIn) {
        push('AuthScreen', {
          mode: 'login',
          headerFull: true,
          lockboxProof: proof,
          amountUsdStr,
          from: 'login',
          tokenName: lockboxInfo?.tokenName,
        });
        return;
      }

      // Use utility to claim
      await claimWithCurrentUser(proof);
      
      if (typeof onClaimSuccess === 'function') {
        shareFlowService.setPendingClaim({
          amountUsdStr,
          from: 'login',
          tokenName: lockboxInfo?.tokenName,
        });
        onClaimSuccess();
      } else {
        push('ClaimSuccessScreen', {
          amountUsdStr,
          from: 'login',
          tokenName: lockboxInfo?.tokenName,
        });
      }
    } catch (err: any) {
      console.error('❌ Claim failed:', err);
      showFlashMessage({
        title: 'Claim failed',
        message: err?.response?.data?.message || err?.message || 'Unable to claim payment',
        type: 'danger',
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  }, [loading, lockbox, lockboxProof, lockboxInfo, onClaimSuccess, amountUsdStrFromLockbox]);

  // Verify passphrase and get lockbox data using utilities
  const handleVerify = async () => {
    const normalizedPassphrase = passphrase.trim();
    if (!normalizedPassphrase) {
      console.log('⚠️ Passphrase empty – attempting claim with blank value');
    }

    let phase: 'verify' | 'claim' = 'verify';
    try {
      if (loading) return;
      setLoading(true);
      setVerifyError(null);
      setLockbox(null);

      // Use utility to compute lockbox proof
      const crypto = computeLockboxProof(
        username || '',
        normalizedPassphrase,
        lockboxSalt!,
        code
      );
      
      setLockboxProof(crypto.lockboxProof);

      // Use utility to get lockbox
      const ret = await getLockbox(crypto.lockboxCommitment);
      console.log('✅ getLockbox response:', ret);
      setLockbox(ret);

      if (ret.status !== 0) return;

      // Get lockbox info using utility
      const info = getLockboxInfo(ret);
      const amountUsdStr = info?.formattedAmount;

      // Check if lockbox is open
      if (!info?.isClaimable) return;

      // Check if user is logged in
      const loggedIn = await isUserLoggedIn();
      if (loggedIn) {
        phase = 'claim';
        
        // Auto-claim if logged in
        await claimWithCurrentUser(crypto.lockboxProof);
        
        if (typeof onClaimSuccess === 'function') {
          shareFlowService.setPendingClaim({
            amountUsdStr,
            from: 'login',
            tokenName: info.tokenName,
          });
          onClaimSuccess();
        } else {
          push('ClaimSuccessScreen', {
            amountUsdStr,
            from: 'login',
            tokenName: info.tokenName,
          });
        }
        return;
      }

      // Not logged in - navigate to auth
      if (signup) {
        push('AuthScreen', {
          mode: 'signup',
          headerFull: true,
          lockboxProof: crypto.lockboxProof,
          amountUsdStr,
          from: 'signup',
          tokenName: info.tokenName,
        });
      } else {
        push('AuthScreen', {
          mode: 'login',
          headerFull: true,
          lockboxProof: crypto.lockboxProof,
          amountUsdStr,
          from: 'login',
          tokenName: info.tokenName,
        });
      }
    } catch (err: any) {
      console.error('❌ Verify failed:', err);
      showFlashMessage({
        title: 'Claim failed',
        message: '',
        type: 'danger',
      });
      if (phase === 'verify') {
        setVerifyError('Incorrect passphrase, please try again');
      }
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  };

  const updatePassphrase = useCallback(
    (value: string) => {
      if (verifyError) setVerifyError(null);
      setPassphrase(value);
    },
    [verifyError]
  );

  return {
    // State
    passphrase,
    setPassphrase: updatePassphrase,
    loading,
    lockbox,
    lockboxProof,
    verifyError,

    // Computed values
    derivedStatus,
    statusColorClass,
    headerSubtitle,

    // Actions
    handleVerify,
    handleClaim,
    formatUsdFromLockbox,

    // Params
    username,
    lockboxSalt,
    code,
    paymentId,
  };
};
