import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionViewModel } from './History/List/TransactionViewModel';

export default function PingHistoryItemView({ item }: { item: TransactionViewModel }) {
  const isPositive = item.isPositive;
  const iconName = isPositive ? 'arrow-down' : 'arrow-up';
  const iconColor = isPositive ? '#fff' : '#EF4444';
  const iconBackground = isPositive ? 'bg-green-500' : 'bg-red-200';
  const amountColor = isPositive ? 'text-green-600' : 'text-red-500';
  const label = item.displayLabel || item.type;

  return (
    <View className="mr-4 w-[280px] rounded-2xl border border-gray-300 bg-white p-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">{formatDate(item.timestamp)}</Text>
        <View className={`ml-2 h-7 w-7 items-center justify-center rounded-full ${iconBackground}`}>
          <Ionicons name={iconName as any} size={14} color={iconColor} />
        </View>
      </View>

      <Text className="text-base font-semibold text-black" numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <Text className={`mt-1 text-lg font-semibold ${amountColor}`}>
        {item.formattedAmount}
      </Text>
    </View>
  );
}

/** Helper to format ISO time into a short readable date/time */
function formatDate(timestamp?: number): string {
  try {
    const date = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
