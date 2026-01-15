import React, { forwardRef, useRef } from 'react';
import { KeyboardTypeOptions, Text, TextInput, TextInputProps, View } from 'react-native';

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
  containerClassName?: string;
};

const AuthInput = forwardRef<TextInput, Props & TextInputProps>(function AuthInput(
  {
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
    containerClassName,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const isEmpty = !value || value.trim() === '';
  const inputRef = useRef<TextInput | null>(null);
  const setInputRef = (node: TextInput | null) => {
    inputRef.current = node;

    if (!ref) return;
    if (typeof ref === 'function') {
      ref(node);
      return;
    }
    (ref as React.MutableRefObject<TextInput | null>).current = node;
  };

  return (
    <View className={containerClassName ?? 'mb-6'}>
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        ref={setInputRef}
        placeholder={placeholder}
        placeholderTextColor="#909090"
        value={value}
        autoFocus={autoFocus}
        editable={editable}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        {...rest}
        onFocus={onFocus}
        onBlur={onBlur}
        className="h-13 px-1 text-xl text-[#0F0F0F]"
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
});

export default AuthInput;
