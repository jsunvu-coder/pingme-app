import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionViewModel } from './TransactionViewModel';
import { formatTime } from 'utils/time';

type HistoryRowProps = {
  event: TransactionViewModel;
  onPress?: () => void;
};

export const HistoryRow = ({ event, onPress }: HistoryRowProps) => {
  const isPositive = event.isPositive;
  const iconName = isPositive ? 'arrow-down' : 'arrow-up';
  const iconColor = isPositive ? '#fff' : '#EF4444';
  const iconBackground = isPositive ? 'bg-green-500' : 'bg-red-200';
  const amountColor = isPositive ? 'text-green-500' : 'text-red-500';
  const label = event.displayLabel || event.type;

  if (onPress) {
    return (
      <TouchableOpacity
        className="mb-4 flex-row items-center justify-between rounded-2xl bg-white px-5 py-5"
        onPress={onPress}
        activeOpacity={0.75}>
        <RowContent
          label={label}
          event={event}
          iconBackground={iconBackground}
          iconName={iconName}
          iconColor={iconColor}
          amountColor={amountColor}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white px-5 py-5">
      <RowContent
        label={label}
        event={event}
        iconBackground={iconBackground}
        iconName={iconName}
        iconColor={iconColor}
        amountColor={amountColor}
      />
    </View>
  );
};

const RowContent = ({
  label,
  event,
  iconBackground,
  iconName,
  iconColor,
  amountColor,
}: {
  label: string;
  event: TransactionViewModel;
  iconBackground: string;
  iconName: string;
  iconColor: string;
  amountColor: string;
}) => (
  <View className="w-full flex-row items-center">
    <View className={`mr-4 h-8 w-8 items-center justify-center rounded-full ${iconBackground}`}>
      <Ionicons name={iconName as any} size={16} color={iconColor} />
    </View>
    <View className="flex-1">
      <Text className="text-sm font-semibold text-black" numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <Text className="text-sm text-gray-400 mt-1 font-light">{formatTime(event.timestamp)}</Text>
    </View>
    <Text className={`text-sm font-semibold ${amountColor}`}>{event.formattedAmount}</Text>
  </View>
);
