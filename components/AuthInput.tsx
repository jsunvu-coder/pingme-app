import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { KeyboardTypeOptions, Platform, Text, TextInput, TextInputProps, View } from 'react-native';

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
  const isFocusedRef = useRef(false);

  // Android-only: keep passwords masked when deleting down to a single character.
  // Some Android IMEs temporarily reveal the remaining character; remounting the input
  // when length transitions down to 1 re-applies password masking. Avoid remounting while
  // focused because unmounting a TextInput will blur and dismiss the keyboard.
  const [androidSecureRemountKey, setAndroidSecureRemountKey] = useState(0);
  const prevLengthRef = useRef<number>(value?.length ?? 0);
  const pendingAndroidSecureRemountRef = useRef(false);
  useEffect(() => {
    const nextLength = value?.length ?? 0;
    const prevLength = prevLengthRef.current;
    prevLengthRef.current = nextLength;

    if (Platform.OS !== 'android' || !secureTextEntry) return;
    if (nextLength === 1 && prevLength > nextLength) {
      if (isFocusedRef.current) {
        pendingAndroidSecureRemountRef.current = true;
        return;
      }
      setAndroidSecureRemountKey((k) => k + 1);
    }
  }, [secureTextEntry, value]);

  return (
    <View className={containerClassName ?? 'mb-6'}>
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        key={Platform.OS === 'android' && secureTextEntry ? androidSecureRemountKey : undefined}
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
        onFocus={(e) => {
          isFocusedRef.current = true;
          onFocus?.(e);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          onBlur?.(e);
          if (Platform.OS !== 'android' || !secureTextEntry) return;
          if (!pendingAndroidSecureRemountRef.current) return;
          pendingAndroidSecureRemountRef.current = false;
          setAndroidSecureRemountKey((k) => k + 1);
        }}
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
