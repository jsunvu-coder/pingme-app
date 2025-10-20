import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventLog } from 'business/models/EventLog';

export const HistoryRow = ({ event }: { event: EventLog }) => {
  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white px-5 py-5">
      {/* Left side */}
      <View className="flex-row items-center space-x-3">
        <View
          className={`mr-4 h-8 w-8 items-center justify-center rounded-full ${
            event.direction === 'sent' ? 'bg-red-200' : 'bg-green-500'
          }`}>
          <Ionicons name={event.iconName as any} size={16} color={event.iconColor} />
        </View>
        <View>
          <Text className="text-lg font-semibold text-black">{event.displayLabel}</Text>
          <Text className="text-xs text-gray-400">{event.readableTime}</Text>
        </View>
      </View>

      <Text className={`text-lg font-semibold ${event.color}`}>{event.amountDisplay}</Text>
    </View>
  );
};
