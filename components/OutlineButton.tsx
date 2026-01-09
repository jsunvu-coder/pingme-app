import { TouchableOpacity, Text, View, Platform } from 'react-native';
import { ReactNode } from 'react';

interface OutlineButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  borderColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  icon?: ReactNode;
}

export default function OutlineButton({
  title,
  onPress,
  disabled = false,
  className = '',
  borderColor,
  textColor,
  fontWeight = 'semibold',
  icon,
}: OutlineButtonProps) {
  const isDisabled = disabled;

  const borderColorClass =
    borderColor === '#FD4912'
      ? isDisabled
        ? 'border-[#D1D5DB]'
        : 'border-[#FD4912]'
      : borderColor === '#E5E5E5'
        ? 'border-[#E5E5E5]'
        : borderColor === '#D1D5DB'
          ? 'border-[#D1D5DB]'
          : isDisabled
            ? 'border-[#D1D5DB]'
            : 'border-[#333]';

  const textColorClass =
    textColor === 'white'
      ? 'text-white'
      : textColor === '#FD4912'
        ? isDisabled
          ? 'text-[#9CA3AF]'
          : 'text-[#FD4912]'
        : textColor === '#9CA3AF'
          ? 'text-[#9CA3AF]'
          : isDisabled
            ? 'text-[#9CA3AF]'
            : 'text-[#333]';

  const fontWeightClass =
    fontWeight === 'normal'
      ? 'font-normal'
      : fontWeight === 'medium'
        ? 'font-medium'
        : fontWeight === 'bold'
          ? 'font-bold'
          : 'font-semibold'; // default: semibold

  const hasCustomHeight = className.includes('h-');
  const defaultClasses = hasCustomHeight ? '' : 'h-16 rounded-full py-4';
  const baseClasses = `flex-row items-center justify-center border bg-transparent ${defaultClasses}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`${baseClasses} ${borderColorClass} ${className}`}>
      <Text
        className={`text-center ${fontWeightClass} ${textColorClass}`}
        style={
          Platform.OS === 'android'
            ? {
                includeFontPadding: false,
                textAlignVertical: 'center',
              }
            : undefined
        }>
        {title}
      </Text>
      {icon && <View className="absolute right-3">{icon}</View>}
    </TouchableOpacity>
  );
}
