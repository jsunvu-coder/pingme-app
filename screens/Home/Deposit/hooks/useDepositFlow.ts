import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showLocalizedAlert } from 'components/LocalizedAlert';
import { BalanceService } from 'business/services/BalanceService';
import { Utils } from 'business/Utils';
import { submitDepositTransaction } from 'business/services/DepositQrService';
import type { BalanceEntry } from 'business/Types';

const MICRO_FACTOR = 1_000_000n;

const formatMicroToUsd = (value?: string | bigint | null): string => {
  try {
    if (value === null || value === undefined) return '0.00';
    const micro = typeof value === 'bigint' ? value : BigInt(value);
    const intPart = micro / MICRO_FACTOR;
    const fracPart = micro % MICRO_FACTOR;
    const scaled = Number(intPart) + Number(fracPart) / Number(MICRO_FACTOR);
    return scaled.toFixed(2);
  } catch {
    return '0.00';
  }
};

const selectDefaultBalance = (balances: BalanceEntry[], token?: string | null): BalanceEntry | null => {
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
  const formatted = formatMicroToUsd(value);
  const numeric = Number(formatted.replace(/,/g, ''));
  return numeric > 0 ? formatted : '';
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

  const [balances, setBalances] = useState<BalanceEntry[]>(() => balanceService.currentBalances);
  const [selectedBalance, setSelectedBalance] = useState<BalanceEntry | null>(() =>
    selectDefaultBalance(balanceService.currentBalances, payload?.token)
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
    (message: string, cancel = true) =>
      showLocalizedAlert({
        message,
        buttons: cancel
          ? [
              { text: 'Cancel', style: 'cancel' as const },
              { text: 'Confirm' as const },
            ]
          : [{ text: 'OK' as const }],
      }),
    []
  );

  useEffect(() => {
    const listener = (nextBalances: BalanceEntry[]) => {
      setBalances(nextBalances);
      setSelectedBalance((prev) => {
        if (!nextBalances.length) return null;
        if (prev) {
          const updated = nextBalances.find((b) => b.token === prev.token);
          if (updated) return updated;
        }
        const preferredToken = payload?.token ?? prev?.token;
        return selectDefaultBalance(nextBalances, preferredToken);
      });
    };

    balanceService.onBalanceChange(listener);

    if (!balanceService.currentBalances.length) {
      balanceService
        .getBalance()
        .catch((err) => console.error('❌ Failed to load balances for deposit flow:', err));
    }

    return () => {
      balanceService.offBalanceChange(listener);
    };
  }, [balanceService, payload?.token]);

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
        setAmount(formatAmountOrEmpty(payload.amount));
        setSelectedBalance((prev) => {
          if (!balances.length) return prev;
          return selectDefaultBalance(balances, payload.token) ?? prev;
        });
      }
    };

    initializeFromPayload();
    return () => {
      mounted = false;
    };
  }, [payload, balances, confirm]);

  const handleAmountBlur = useCallback(() => {
    setAmount((prev) => normalizeAmountInput(prev));
  }, []);

  const selectBalance = useCallback(
    (entry: BalanceEntry) => {
      setSelectedBalance(entry);
    },
    []
  );

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
    const entry = selectedBalance;
    const trimmedCommitment = commitment.trim();
    const trimmedAmount = amount.trim();

    if (!entry) {
      await confirm('_ALERT_SELECT_BALANCE', false);
      return;
    }

    if (!trimmedCommitment) {
      await confirm('_ALERT_MISSING_COMMITMENT', false);
      return;
    }

    if (!trimmedAmount) {
      await confirm('_ALERT_ENTER_AMOUNT', false);
      return;
    }

    const numericAmount = Number(trimmedAmount.replace(/,/g, ''));
    if (!Number.isFinite(numericAmount)) {
      await confirm('_ALERT_ENTER_AMOUNT', false);
      return;
    }

    if (numericAmount < 1) {
      await showLocalizedAlert({
        title: 'Invalid amount',
        message: 'Amount must be at least $1.00.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    const proceed = await confirm('_CONFIRM_PAYMENT');
    if (!proceed) return;

    setLoading(true);
    setTxHash(null);

    try {
      const { txHash } = await submitDepositTransaction({
        token: entry.token,
        commitment: trimmedCommitment,
        amountDecimal: trimmedAmount,
        availableBalance: entry.amount,
      });

      setTxHash(txHash);
    } catch (error) {
      console.error('❌ withdrawAndDeposit failed:', error);
      const message = (error as Error)?.message ?? '_ALERT_PAYMENT_FAILED';
      if (message.startsWith('_')) {
        await confirm(message, false);
      } else {
        await showLocalizedAlert({
          title: 'Deposit failed',
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    commitment,
    confirm,
    selectedBalance,
  ]);

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
    formatMicroToUsd,
  };
};
