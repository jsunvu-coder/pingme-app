import { View, TextInput, Text } from 'react-native';
import React from 'react';

type Props = {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  customView?: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
};

export default function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  customView,
  error = false,
  errorMessage,
}: Props) {
  const isEmpty = !value || value.trim() === '';

  return (
    <View className="mb-6">
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#909090"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        className="h-12 px-1 text-2xl text-[#0F0F0F]"
      />

      <View
        style={{
          height: 2,
          backgroundColor: error ? '#FB1028' : isEmpty ? '#3B3A3A' : '#BEBEBE',
          marginTop: 6,
        }}
      />

      {error && errorMessage && <Text className="text-[#FB1028] mt-2 text-sm font-medium">{errorMessage}</Text>}

      {customView && <View className="mt-4">{customView}</View>}
    </View>
  );
}
