import { TouchableOpacity, Text, View } from 'react-native';
import { ReactNode } from 'react';

interface OutlineButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
  borderColor?: string;
  textColor?: string;
  icon?: ReactNode;
}

export default function OutlineButton({
  title,
  onPress,
  className = '',
  borderColor,
  textColor,
  icon,
}: OutlineButtonProps) {
  const borderColorClass =
    borderColor === '#FD4912'
      ? 'border-[#FD4912]'
      : borderColor === '#E5E5E5'
        ? 'border-[#E5E5E5]'
        : 'border-[#333]';

  const textColorClass =
    textColor === 'white'
      ? 'text-white'
      : textColor === '#FD4912'
        ? 'text-[#FD4912]'
        : 'text-[#333]';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`h-16 flex-row items-center justify-center rounded-full border bg-transparent py-4 ${borderColorClass} ${className}`}>
      <Text className={`text-center text-lg font-bold ${textColorClass}`}>{title}</Text>
      {icon && <View className="absolute right-3">{icon}</View>}
    </TouchableOpacity>
  );
}
