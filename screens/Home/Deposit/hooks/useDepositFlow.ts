import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { BalanceService } from 'business/services/BalanceService';
import { Utils } from 'business/Utils';
import { submitDepositTransaction } from 'business/services/DepositQrService';
import type { BalanceEntry } from 'business/Types';

const selectDefaultBalance = (
  balances: BalanceEntry[],
  token?: string | null
): BalanceEntry | null => {
  if (!balances.length) return null;
  if (token) {
    const found = balances.find((b) => b.token === token);
    if (found) return found;
  }
  return balances[0];
};

const normalizeAmountInput = (value: string): string => {
  if (!value?.trim()) return '';
  const formatted = Utils.toCurrency(value);
  return formatted || '0.00';
};

const formatAmountOrEmpty = (value?: string): string => {
  if (!value) return '';
  try {
    const micro = BigInt(value);
    if (micro <= 0n) return '';
    return Utils.formatMicroToUsd(micro, undefined, { grouping: false, empty: '' });
  } catch {
    return '';
  }
};

export interface DepositPayload {
  token?: string;
  amount?: string;
  commitment?: string;
}

export interface ParsedDepositLink {
  payload?: DepositPayload;
  errorKey?: string;
}

const normalizeParam = (value: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return undefined;
  }
  return trimmed;
};

export const parseDepositLink = (raw: string): ParsedDepositLink => {
  try {
    const url = new URL(raw.trim());
    const path = url.pathname.toLowerCase();

    if (!path.includes('/deposit')) {
      return { errorKey: '_ALERT_INVALID_QR_LINK' };
    }

    const commitment = normalizeParam(url.searchParams.get('commitment'));
    if (!commitment) {
      return { errorKey: '_ALERT_INVALID_QR_CODE' };
    }

    const amount = normalizeParam(url.searchParams.get('amount'));
    const token = normalizeParam(url.searchParams.get('token'));

    return {
      payload: {
        commitment,
        amount,
        token,
      },
    };
  } catch (error) {
    console.error('[parseDepositLink] Failed to parse deposit link:', error);
    return { errorKey: '_ALERT_INVALID_QR_FORMAT' };
  }
};

export const useDepositFlow = (payload?: DepositPayload | null) => {
  const balanceService = useMemo(() => BalanceService.getInstance(), []);

  const initialStableBalances = useMemo(
    () => balanceService.getStablecoinBalances(),
    [balanceService]
  );
  const getStablecoinTotal = useCallback(
    () => balanceService.getStablecoinTotal(),
    [balanceService]
  );
  const [balances, setBalances] = useState<BalanceEntry[]>(initialStableBalances);
  const [stablecoinTotal, setStablecoinTotal] = useState<string>(() => getStablecoinTotal());
  const [selectedBalance, setSelectedBalance] = useState<BalanceEntry | null>(() =>
    selectDefaultBalance(initialStableBalances, payload?.token)
  );
  const [amount, setAmount] = useState<string>(() => formatAmountOrEmpty(payload?.amount));
  const [commitment, setCommitment] = useState<string>(payload?.commitment ?? '');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanned, setScanned] = useState<boolean>(Boolean(payload));
  const [isQrActive, setIsQrActive] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const confirm = useCallback(
    (message: string, cancel = true, titleKey?: string) =>
      showLocalizedAlert({
        message,
        title: titleKey,
        buttons: cancel
          ? [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Confirm' as const }]
          : [{ text: 'OK' as const }],
      }),
    []
  );

  useEffect(() => {
    const listener = () => {
      const stableBalances = balanceService.getStablecoinBalances();
      setBalances(stableBalances);
      setStablecoinTotal(getStablecoinTotal());
      setSelectedBalance((prev) => {
        if (!stableBalances.length) return null;
        if (prev) {
          const updated = stableBalances.find((b) => b.token === prev.token);
          if (updated) return updated;
        }
        const preferredToken = payload?.token ?? prev?.token;
        return selectDefaultBalance(stableBalances, preferredToken);
      });
    };

    balanceService.onBalanceChange(listener);

    if (!balanceService.currentBalances.length) {
      balanceService
        .getBalance()
        .catch((err) => console.error('❌ Failed to load balances for deposit flow:', err));
    } else {
      // Sync stablecoin total immediately if balances already loaded
      setStablecoinTotal(getStablecoinTotal());
    }

    return () => {
      balanceService.offBalanceChange(listener);
    };
  }, [balanceService, payload?.token, getStablecoinTotal]);

  useEffect(() => {
    if (!payload) return;
    let mounted = true;

    const initializeFromPayload = async () => {
      setScanned(true);

      if (!payload.commitment) {
        await confirm('_ALERT_INVALID_QR_CODE', false);
        if (mounted) {
          setCommitment('');
          setAmount('');
        }
        return;
      }

      if (mounted) {
        setCommitment(payload.commitment);
        // Only initialize amount from payload if user hasn't already entered a value
        setAmount((prev) => (prev ? prev : formatAmountOrEmpty(payload.amount)));
      }
    };

    initializeFromPayload();
    return () => {
      mounted = false;
    };
  }, [payload, confirm]);

  const handleAmountBlur = useCallback(() => {
    setAmount((prev) => normalizeAmountInput(prev));
  }, []);

  const selectBalance = useCallback((entry: BalanceEntry) => {
    setSelectedBalance(entry);
  }, []);

  const handleQrResult = useCallback(
    async (value: string) => {
      const { payload: parsed, errorKey } = parseDepositLink(value);
      if (!parsed) {
        await confirm(errorKey ?? '_ALERT_INVALID_QR_CODE', false);
        return;
      }

      setCommitment(parsed.commitment ?? '');
      setAmount(formatAmountOrEmpty(parsed.amount));
      setSelectedBalance((prev) => {
        if (!balances.length) return prev;
        return selectDefaultBalance(balances, parsed.token) ?? prev;
      });
      setScanned(true);
    },
    [balances, confirm]
  );

  const withdrawAndDeposit = useCallback(async () => {
    // Prevent spamming / double-submit while a request is already in-flight
    if (loading) {
      return;
    }

    const entry = selectedBalance;
    const trimmedCommitment = commitment.trim();
    const trimmedAmount = amount.trim();
    // Always compute using latest stablecoin total from the service
    const latestStablecoinTotal = getStablecoinTotal();
    setStablecoinTotal(latestStablecoinTotal);
    const normalizedStablecoinTotal = latestStablecoinTotal.replace(/,/g, '');
    const stablecoinTotalMicro = Utils.toMicro(normalizedStablecoinTotal || '0');

    // Check if user has any stablecoin balance
    if (stablecoinTotalMicro <= 0n || balances.length === 0) {
      await confirm('_ALERT_ABOVE_AVAILABLE', false, '_TITLE_ABOVE_AVAILABLE');
      return;
    }

    // Check if user has selected a balance
    if (!entry) {
      await confirm('_ALERT_ABOVE_AVAILABLE', false, '_TITLE_ABOVE_AVAILABLE');
      return;
    }

    if (!trimmedCommitment) {
      await confirm('_ALERT_MISSING_COMMITMENT', false);
      return;
    }

    if (!trimmedAmount) {
      await confirm('_ALERT_ENTER_AMOUNT', false, '_TITLE_ENTER_AMOUNT');
      return;
    }

    const normalized = trimmedAmount.replace(/,/g, '');
    if (!/^\d*\.?\d*$/.test(normalized)) {
      await confirm('_ALERT_INVALID_AMOUNT', false, '_TITLE_INVALID_AMOUNT');
      return;
    }

    const numericAmount = Number(normalized);
    if (!Number.isFinite(numericAmount)) {
      await confirm('_ALERT_INVALID_AMOUNT', false, '_TITLE_INVALID_AMOUNT');
      return;
    }

    if (numericAmount < 1) {
      await showLocalizedAlert({
        title: 'Amount too low',
        message: 'Minimum payment amount is $1.00.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    // Do not allow spending above available stablecoin total
    if (Utils.toMicro(normalized) > stablecoinTotalMicro) {
      await confirm('_ALERT_ABOVE_AVAILABLE', false, '_TITLE_ABOVE_AVAILABLE');
      return;
    }

    const proceed = await confirm('_CONFIRM_PAYMENT');
    if (!proceed) return;

    setLoading(true);
    setTxHash(null);

    try {
      const { txHash } = await submitDepositTransaction({
        token: (entry as any)?.tokenAddress ?? entry.token,
        commitment: trimmedCommitment,
        amountDecimal: trimmedAmount,
        // Send total stablecoin balance (micro) for backend-side validation
        availableBalance: stablecoinTotalMicro.toString(),
      });

      setTxHash(txHash);
    } catch (error) {
      console.error('❌ withdrawAndDeposit failed:', error);
      const message = (error as Error)?.message ?? '_ALERT_PAYMENT_FAILED';
      if (message.startsWith('_')) {
        const titleKey =
          message === '_ALERT_ABOVE_AVAILABLE' ? '_TITLE_ABOVE_AVAILABLE' : undefined;
        await confirm(message, false, titleKey);
      } else {
        await showLocalizedAlert({
          title: 'Deposit failed',
          message,
        });
      }
    } finally {
    }
  }, [amount, commitment, confirm, selectedBalance, loading, balances, getStablecoinTotal]);

  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const copyTxHash = useCallback(async () => {
    if (!txHash) return;
    await Utils.copyToClipboard(txHash);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1000);
  }, [txHash]);

  const resetSection = useCallback(() => {
    setIsQrActive(false);
    setScanned(false);
    setTxHash(null);
    setCommitment('');
    setAmount('');
  }, []);

  const toggleQr = useCallback(() => {
    setIsQrActive((prev) => !prev);
  }, []);

  return {
    // Data
    balances,
    selectedBalance,
    stablecoinTotal,
    amount,
    commitment,
    txHash,
    loading,
    copied,
    scanned,
    isQrActive,

    // Actions
    setAmount,
    setCommitment,
    handleAmountBlur,
    selectBalance,
    handleQrResult,
    withdrawAndDeposit,
    copyTxHash,
    resetSection,
    toggleQr,

    // Helpers
    formatMicroToUsd: (value?: string | bigint | null) =>
      Utils.formatMicroToUsd(value, undefined, { grouping: true, empty: '0.00' }),
  };
};
