import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { CryptoUtils } from 'business/CryptoUtils';
import { ContractService } from 'business/services/ContractService';
import { solidityPacked } from 'ethers';
import { push } from 'navigation/Navigation';

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
}

export const useClaimPayment = () => {
  const route = useRoute<any>();
  const params = useMemo(() => route?.params ?? {}, [route?.params]);
  const { username, lockboxSalt, code, paymentId, ...restParams } = params as ClaimPaymentParams;

  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockbox, setLockbox] = useState<LockboxData | null>(null);
  const [lockboxProof, setLockboxProof] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const contractService = useMemo(() => ContractService.getInstance(), []);

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
  const formatUsdFromLockbox = () => {
    try {
      const amt = parseFloat(String(lockbox?.amount ?? '0')) / 1_000_000;
      if (!isFinite(amt)) return undefined;
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amt);
    } catch {
      return undefined;
    }
  };

  // Verify passphrase and get lockbox data
  const handleVerify = async () => {
    const normalizedPassphrase = passphrase.trim();
    if (!normalizedPassphrase) {
      console.log('⚠️ Passphrase empty – attempting claim with blank value');
    }

    try {
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

      if (ret.status === 0) {
        const amountUsdStr = (() => {
          try {
            const amt = parseFloat(String(ret.amount ?? '0')) / 1_000_000;
            if (!isFinite(amt)) return undefined;
            return amt.toFixed(2);
          } catch {
            return undefined;
          }
        })();

        push('AuthScreen', {
          mode: 'login',
          headerType: 'full',
          showTabs: true,
          lockboxProof: finalProof,
          amountUsdStr,
          from: 'login',
        });
      }
    } catch (err: any) {
      console.error('❌ Verify failed:', err);
      setVerifyError('Incorrect passphrase, please try again');
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
    formatUsdFromLockbox,

    // Params
    username,
    lockboxSalt,
    code,
    paymentId,
  };
};
