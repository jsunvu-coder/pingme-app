import { View, TextInput, Text, KeyboardTypeOptions, TextInputProps } from 'react-native';
import React, { RefAttributes } from 'react';

type Props = {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  customView?: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
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
  keyboardType,
  autoCapitalize,
  autoFocus = false,
  editable = true,
  ref,
  ...rest
}: Props & TextInputProps & RefAttributes<any>) {
  const isEmpty = !value || value.trim() === '';

  return (
    <View className="mb-6">
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        ref={ref}
        placeholder={placeholder}
        placeholderTextColor="#909090"
        value={value}
        autoFocus={autoFocus}
        editable={editable}
        onChangeText={onChangeText}
        autoCorrect={false}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        secureTextEntry={secureTextEntry}
        className="h-12 px-1 text-xl text-[#0F0F0F]"
        {...rest}
      />

      <View
        style={{
          height: 1,
          backgroundColor: error ? '#FB1028' : isEmpty ? '#3B3A3A' : '#BEBEBE',
          marginTop: 6,
        }}
      />

      {error && errorMessage && (
        <Text className="mt-2 text-sm font-medium text-[#FB1028]">{errorMessage}</Text>
      )}

      {customView && <View className="mt-4">{customView}</View>}
    </View>
  );
}
