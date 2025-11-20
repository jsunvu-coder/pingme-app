import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import NavigationBar from 'components/NavigationBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from 'components/PrimaryButton';
import { ContractService } from 'business/services/ContractService';
import { TransactionViewModel } from '../List/TransactionViewModel';
import { showFlashMessage } from 'utils/flashMessage';
import SecondaryButton from 'components/ScondaryButton';
import GhostButton from 'components/GhostButton';

type TransactionDetailsParams = {
  transaction?: TransactionViewModel;
};

type LockboxDetail = {
  status?: number;
  unlockTime?: number;
  currentTime?: number;
  createTime?: number;
  amount?: string;
};

type LockboxStatus = 'OPEN' | 'EXPIRED' | 'CLAIMED' | 'RECLAIMED' | 'UNKNOWN';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_META: Record<
  LockboxStatus,
  { label: string; textClass: string; icon: IoniconName; iconColor: string }
> = {
  OPEN: {
    label: 'Open',
    textClass: 'text-emerald-600',
    icon: 'time-outline',
    iconColor: '#059669',
  },
  EXPIRED: {
    label: 'Expired',
    textClass: 'text-orange-600',
    icon: 'alert-circle-outline',
    iconColor: '#EA580C',
  },
  CLAIMED: {
    label: 'Claimed',
    textClass: 'text-blue-600',
    icon: 'checkmark-circle-outline',
    iconColor: '#2563EB',
  },
  RECLAIMED: {
    label: 'Reclaimed',
    textClass: 'text-neutral-600',
    icon: 'arrow-undo-outline',
    iconColor: '#525252',
  },
  UNKNOWN: {
    label: 'Unknown',
    textClass: 'text-neutral-500',
    icon: 'help-circle-outline',
    iconColor: '#6B7280',
  },
};

export default function TransactionDetailsScreen() {
  const route = useRoute();
  const { transaction } = (route.params as TransactionDetailsParams) || {};

  const [lockboxDetail, setLockboxDetail] = useState<LockboxDetail | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractService = useMemo(() => ContractService.getInstance(), []);
  const lockboxCommitment = transaction?.lockboxCommitment;

  const fetchLockboxDetail = useCallback(async () => {
    if (!lockboxCommitment) {
      setLockboxDetail(null);
      return;
    }

    try {
      setFetchingDetail(true);
      setError(null);
      const detail = await contractService.getLockbox(lockboxCommitment);
      setLockboxDetail(detail);
    } catch (err: any) {
      console.error('❌ Failed to load lockbox detail:', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to fetch the latest transaction status.';
      setError(message);
    } finally {
      setFetchingDetail(false);
    }
  }, [contractService, lockboxCommitment]);

  useEffect(() => {
    fetchLockboxDetail();
  }, [fetchLockboxDetail]);

  const lockboxStatus = useMemo<LockboxStatus>(() => {
    if (!lockboxDetail) return 'UNKNOWN';

    const rawStatus = Number(lockboxDetail.status ?? -1);
    if (rawStatus === 1) return 'CLAIMED';
    if (rawStatus === 2) return 'RECLAIMED';
    if (rawStatus === 0) {
      const unlock = Number(lockboxDetail.unlockTime ?? 0);
      const current = Number(lockboxDetail.currentTime ?? 0);
      return unlock > current ? 'OPEN' : 'EXPIRED';
    }
    return 'UNKNOWN';
  }, [lockboxDetail]);

  const statusMeta = STATUS_META[lockboxStatus];
  const showStatusRow = !!lockboxDetail && !error;

  const createdSeconds =
    Number(lockboxDetail?.createTime ?? 0) > 0
      ? Number(lockboxDetail?.createTime)
      : toSeconds(transaction?.timestamp);
  const expirySeconds = Number(lockboxDetail?.unlockTime ?? 0) || undefined;

  const showReclaim = !!lockboxCommitment && lockboxStatus === 'EXPIRED';

  const amountDisplay = formatCurrency(Math.abs(transaction?.amount ?? 0));

  const handleReclaim = useCallback(async () => {
    if (!lockboxCommitment) return;

    try {
      setReclaiming(true);
      await reclaim(lockboxCommitment);
      showFlashMessage({
        type: 'success',
        icon: 'success',
        title: 'Payment reclaimed',
        message: 'Funds were returned to your balance.',
      });
      await fetchLockboxDetail();
    } catch (err: any) {
      console.error('❌ Failed to reclaim payment:', err);
      const message =
        err?.response?.data?.message || err?.message || 'Unable to reclaim this payment.';
      showFlashMessage({
        type: 'danger',
        icon: 'danger',
        title: 'Reclaim failed',
        message,
      });
    } finally {
      setReclaiming(false);
    }
  }, [contractService, fetchLockboxDetail, lockboxCommitment]);

  if (!transaction) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <SafeAreaView edges={['top']} />
        <NavigationBar title="Transaction Details" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-gray-500">Transaction data unavailable.</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <NavigationBar title="Transaction Details" />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingBottom: 40,
        }}>
        <View className="mt-6 rounded-2xl bg-white p-5">
          <DetailRow label="Amount" value={amountDisplay} />
          <DetailRow label="Recipient" value={transaction.addr || '-'} />
          <DetailRow label="Created" value={formatTimestamp(createdSeconds)} />
          {expirySeconds ? (
            <DetailRow label="Expiry" value={formatTimestamp(expirySeconds)} />
          ) : null}
          {showStatusRow ? (
            <DetailRow
              label="Status"
              value={statusMeta.label}
              valueClassName="flex-row items-center"
              valueTextClassName={statusMeta.textClass}
              icon={
                <Ionicons name={statusMeta.icon as any} size={16} color={statusMeta.iconColor} />
              }
            />
          ) : null}
        </View>

        {fetchingDetail ? (
          <View className="mt-6 flex-row items-center justify-center space-x-3">
            <ActivityIndicator color="#FD4912" />
            <Text className="text-sm text-gray-500">Refreshing transaction status…</Text>
          </View>
        ) : null}

        {showReclaim ? (
          <View className="mt-10">
            <GhostButton
              title="Reclaim Payment"
              onPress={handleReclaim}
              loading={reclaiming}
              loadingText="Reclaiming"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueClassName = '',
  valueTextClassName = '',
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  valueTextClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="mb-6 flex-row justify-between">
      <Text className="mb-1 text-[15px] text-[#909090]">{label}</Text>
      <View className={`flex-row items-center ${valueClassName}`}>
        {icon && <View className="mr-1">{icon}</View>}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`max-w-50 text-[16px] text-[#0F0F0F] ${valueTextClassName}`}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const formatCurrency = (value?: number) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const formatTimestamp = (seconds?: number) => {
  const ts = typeof seconds === 'number' ? seconds : Number(seconds);
  if (!Number.isFinite(ts) || ts <= 0) return '-';

  const date = new Date(ts * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const toSeconds = (timestamp?: number) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return undefined;
  return Math.floor(timestamp / 1000);
};

async function reclaim(lockboxCommitment: string) {
  return ContractService.getInstance().reclaim(lockboxCommitment);
}
