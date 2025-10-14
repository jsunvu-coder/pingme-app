import { View, Text } from 'react-native';
import { LockboxStatus, LockboxData } from './hooks/useClaimPayment';
import { formatTime } from './utils/claimUtils';

interface StatusCardProps {
  lockbox: LockboxData;
  status: LockboxStatus;
  statusColorClass: string;
}

export const StatusCard = ({ lockbox, status, statusColorClass }: StatusCardProps) => (
  <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
    <View className="flex-row items-center justify-between">
      <Text className="text-base font-semibold text-neutral-600">Status</Text>
      <Text className={`text-base font-semibold ${statusColorClass}`}>{status}</Text>
    </View>

    <View className="mt-3 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-neutral-600">Create Time</Text>
      <Text className="text-base text-neutral-900">{formatTime(lockbox.createTime)}</Text>
    </View>

    <View className="mt-3 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-neutral-600">Expiry Time</Text>
      <Text className="text-base text-neutral-900">{formatTime(lockbox.unlockTime)}</Text>
    </View>
  </View>
);
