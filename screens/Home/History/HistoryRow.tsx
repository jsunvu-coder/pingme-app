import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionViewModel } from './TransactionViewModel';

export const HistoryRow = ({ event }: { event: TransactionViewModel }) => {
  const isPositive = event.isPositive;
  const iconName = isPositive ? 'arrow-down' : 'arrow-up';
  const iconColor = isPositive ? '#fff' : '#EF4444';
  const iconBackground = isPositive ? 'bg-green-500' : 'bg-red-200';
  const amountColor = isPositive ? 'text-green-500' : 'text-red-500';
  const label = event.displayLabel || event.type;

  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white px-5 py-5">
      {/* Left side */}
      <View className="flex-row items-center space-x-3">
        <View
          className={`mr-4 h-8 w-8 items-center justify-center rounded-full ${iconBackground}`}>
          <Ionicons name={iconName as any} size={16} color={iconColor} />
        </View>
        <View>
          <Text className="text-lg font-semibold text-black">{label}</Text>
          <Text className="text-xs text-gray-400">{event.formattedDate}</Text>
        </View>
      </View>

      <Text className={`text-lg font-semibold ${amountColor}`}>{event.formattedAmount}</Text>
    </View>
  );
};
