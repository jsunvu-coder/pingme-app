import { View, Text } from 'react-native';
import { PingHistoryItem } from './PingHistoryStorage';

export default function PingHistoryItemView({ item }: { item: PingHistoryItem }) {
  const isClaimed = item.status === 'claimed';
  return (
    <View className="mr-4 w-[280px] rounded-2xl border border-gray-300 bg-white p-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs text-gray-400">{formatDate(item.time)}</Text>
        <Text
          className={`text-lg font-semibold ${isClaimed ? 'text-green-600' : 'text-orange-500'}`}>
          {item.amount}
        </Text>
      </View>

      {/* Email */}
      <Text className="text-sm text-gray-700" numberOfLines={1} ellipsizeMode="tail">
        {item.email}
      </Text>
    </View>
  );
}

/** Helper to format ISO time into a short readable date/time */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
