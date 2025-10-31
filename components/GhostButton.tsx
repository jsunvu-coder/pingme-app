import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface GhostButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

export default function GhostButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingText,
  className = '',
}: GhostButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center rounded-full border px-8 py-4 ${
        isDisabled ? 'border-[#E0E0E0] bg-transparent' : 'border-[#FD4912] bg-transparent'
      } ${className}`}>
      {loading ? (
        <View className="flex-row items-center justify-center">
          <ActivityIndicator color={isDisabled ? '#B5B5B5' : '#FD4912'} className="mr-2" />
          <Text
            className={`text-center text-lg font-bold ${
              isDisabled ? 'text-[#B5B5B5]' : 'text-[#FD4912]'
            }`}>
            {loadingText || 'Processing...'}
          </Text>
        </View>
      ) : (
        <Text
          className={`text-center text-lg font-bold ${
            isDisabled ? 'text-[#B5B5B5]' : 'text-[#FD4912]'
          }`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
