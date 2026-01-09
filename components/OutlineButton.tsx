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

  const getTextColorStyle = () => {
    if (isDisabled) {
      return { color: '#909090' };
    }
    if (textColor) {
      // If textColor is provided, use it directly
      return { color: textColor };
    }
    // Default color
    return { color: '#0F0F0F' };
  };

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
        className="text-center"
        style={{
          ...(Platform.OS === 'android'
            ? {
                includeFontPadding: false,
                textAlignVertical: 'center',
              }
            : {}),
          fontWeight:
            fontWeight === 'bold'
              ? '700'
              : fontWeight === 'semibold'
                ? '600'
                : fontWeight === 'medium'
                  ? '500'
                  : fontWeight === 'normal'
                    ? '400'
                    : '600', // default semibold
          ...getTextColorStyle(),
        }}>
        {title}
      </Text>
      {icon && <View className="absolute right-3">{icon}</View>}
    </TouchableOpacity>
  );
}
