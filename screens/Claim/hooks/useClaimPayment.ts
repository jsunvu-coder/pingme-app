import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { CryptoUtils } from 'business/CryptoUtils';
import { Utils } from 'business/Utils';
import { ContractService } from 'business/services/ContractService';
import { AuthService } from 'business/services/AuthService';
import { shareFlowService } from 'business/services/ShareFlowService';
import { solidityPacked } from 'ethers';
import { push } from 'navigation/Navigation';
import { showFlashMessage } from 'utils/flashMessage';

export type LockboxStatus = 'OPEN' | 'EXPIRED' | 'CLAIMED' | 'RECLAIMED' | 'UNKNOWN';

export interface LockboxData {
  status: number;
  unlockTime: number;
  currentTime: number;
  createTime: number;
  amount: string;
}

export interface ClaimPaymentParams {
  username?: string;
  lockboxSalt?: string;
  code?: string;
  paymentId?: string;
  onClaimSuccess?: () => void;
  signup?: boolean;
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

  const contractService = useMemo(() => ContractService.getInstance(), []);
  const authService = useMemo(() => AuthService.getInstance(), []);

  // Validate deep link params
  useEffect(() => {
    console.log('🔗 [ClaimPaymentScreen] Deep link params:', {
      username,
      lockboxSalt,
      code,
      paymentId,
      ...restParams,
    });

    const hasValidLockboxSalt = typeof lockboxSalt === 'string' && lockboxSalt.startsWith('0x');
    if (!hasValidLockboxSalt) {
      console.warn('⚠️ Invalid deep link for ClaimPaymentScreen: missing/invalid lockboxSalt.');
    }
  }, [username, lockboxSalt, code, paymentId, restParams]);

  // Derive lockbox status
  const derivedStatus = useMemo((): LockboxStatus => {
    if (!lockbox) return 'UNKNOWN';

    const rawStatus = Number(lockbox.status);
    if (rawStatus === 0) {
      const unlockTime = Number(lockbox.unlockTime ?? 0);
      const currentTime = Number(lockbox.currentTime ?? 0);
      return unlockTime > currentTime ? 'OPEN' : 'EXPIRED';
    }
    if (rawStatus === 1) return 'CLAIMED';
    if (rawStatus === 2) return 'RECLAIMED';
    return 'UNKNOWN';
  }, [lockbox]);

  // Status color mapping
  const statusColorClass = useMemo(() => {
    switch (derivedStatus) {
      case 'OPEN':
        return 'text-emerald-600';
      case 'EXPIRED':
        return 'text-orange-600';
      case 'CLAIMED':
        return 'text-blue-600';
      case 'RECLAIMED':
        return 'text-neutral-600';
      default:
        return 'text-neutral-600';
    }
  }, [derivedStatus]);

  // Header subtitle based on status
  const headerSubtitle = useMemo(() => {
    switch (derivedStatus) {
      case 'OPEN':
        return 'Payment is available to claim.';
      case 'EXPIRED':
        return 'But payment has expired.';
      case 'CLAIMED':
        return 'But payment has already been claimed.';
      case 'RECLAIMED':
        return 'But payment has been reclaimed by sender.';
      default:
        return '';
    }
  }, [derivedStatus]);

  // Format USD amount from lockbox
  // Note: Lockbox typically uses stablecoin (6 decimals), but we use default 6 as fallback
  const formatUsdFromLockbox = () => {
    try {
      if (!lockbox?.amount) return undefined;
      // Default to 6 decimals for lockbox (typically stablecoin)
      const tokenDecimals = 6;
      const formatted = Utils.formatMicroToUsd(
        lockbox.amount,
        undefined,
        {
          grouping: true,
          empty: '',
        },
        tokenDecimals
      );
      return formatted || undefined;
    } catch {
      return undefined;
    }
  };

  const amountUsdStrFromLockbox = (lb?: LockboxData | null) => {
    try {
      if (!lb?.amount) return undefined;
      // Default to 6 decimals for lockbox (typically stablecoin)
      const tokenDecimals = 6;
      const formatted = Utils.formatMicroToUsd(
        lb.amount,
        undefined,
        {
          grouping: true,
          empty: '',
        },
        tokenDecimals
      );
      return formatted || undefined;
    } catch {
      return undefined;
    }
  };

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

      const isLoggedIn = await authService.isLoggedIn();
      if (!isLoggedIn) {
        push('AuthScreen', {
          mode: 'login',
          headerFull: true,
          lockboxProof: proof,
          amountUsdStr,
          from: 'login',
        });
        return;
      }

      await authService.claimWithCurrentCrypto(proof);
      if (typeof onClaimSuccess === 'function') {
        shareFlowService.setPendingClaim({ amountUsdStr, from: 'login' });
        onClaimSuccess();
      } else {
        push('ClaimSuccessScreen', { amountUsdStr, from: 'login' });
      }
    } catch (err: any) {
      console.error('❌ Claim failed:', err);
      showFlashMessage({
        title: 'Claim failed',
        message: err?.response?.data?.message || err?.message || 'Unable to claim payment',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [authService, loading, lockbox, lockboxProof, onClaimSuccess]);

  // Verify passphrase and get lockbox data
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

      const user = (username || '').toLowerCase().trim();
      const pass = normalizedPassphrase;
      const inputData = CryptoUtils.strToHex2(user, pass);
      const p = CryptoUtils.globalHash2(inputData, lockboxSalt!);
      if (!p) throw new Error('Failed to compute p');

      const finalProof = code
        ? CryptoUtils.globalHash(
            solidityPacked(
              ['bytes32', 'bytes32'],
              [CryptoUtils.toBytesLike(code), CryptoUtils.globalHash(p)]
            )
          )
        : p;

      if (!finalProof) throw new Error('Failed to compute lockboxProof');
      setLockboxProof(finalProof);

      const lockboxCommitment = CryptoUtils.globalHash(finalProof);
      if (!lockboxCommitment) throw new Error('Failed to compute lockbox commitment');

      const ret = await contractService.getLockbox(lockboxCommitment);
      console.log('✅ getLockbox response:', ret);
      setLockbox(ret);

      if (ret.status !== 0) return;

      const amountUsdStr = amountUsdStrFromLockbox(ret);

      const unlockTime = Number(ret.unlockTime ?? 0);
      const currentTime = Number(ret.currentTime ?? 0);
      const isOpen = unlockTime > currentTime;
      if (!isOpen) return;

      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        phase = 'claim';
        await authService.claimWithCurrentCrypto(finalProof);
        if (typeof onClaimSuccess === 'function') {
          shareFlowService.setPendingClaim({ amountUsdStr, from: 'login' });
          onClaimSuccess();
        } else {
          push('ClaimSuccessScreen', { amountUsdStr, from: 'login' });
        }
        return;
      }

      if (signup) {
        push('AuthScreen', {
          mode: 'signup',
          headerFull: true,
          lockboxProof: finalProof,
          amountUsdStr,
          from: 'signup',
        });
      } else {
        push('AuthScreen', {
          mode: 'login',
          headerFull: true,
          lockboxProof: finalProof,
          amountUsdStr,
          from: 'login',
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
      setLoading(false);
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
