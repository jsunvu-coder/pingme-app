import { View, Text } from 'react-native';
import BellIcon from 'assets/BellIcon';
import NotificationBellButton from './NotificationBellButton';

type HeaderProps = {
  title?: string;
  variant?: 'light' | 'dark'; // light → orange text, dark → white text
  iconColor?: string;
};

export default function HeaderView({ title = 'Home', variant = 'dark' }: HeaderProps) {
  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-[#FD4912]';
  const iconColor = isDark ? 'white' : '#FD4912';

  return (
    <View className="flex-row items-start justify-between px-6 pt-4">
      <Text className={`text-3xl font-semibold ${textColor}`}>{title}</Text>
      <NotificationBellButton color={iconColor} />
    </View>
  );
}
