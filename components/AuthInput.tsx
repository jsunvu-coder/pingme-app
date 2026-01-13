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
  const MASK_CHAR = '•';
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

  const isAndroidSecure = Platform.OS === 'android' && !!secureTextEntry;
  const displayValue = isAndroidSecure ? MASK_CHAR.repeat(value.length) : value;

  const handleChangeText = (nextText: string) => {
    if (!isAndroidSecure) {
      onChangeText(nextText);
      return;
    }

    // We render mask chars in the input, but we still keep the raw password in state (parent).
    // Translate changes from the masked field back into the raw value.
    const prevRaw = value;

    // Some keyboards/autofill may provide raw text (no mask chars). Accept it as-is.
    if (!nextText.includes(MASK_CHAR)) {
      onChangeText(nextText);
      return;
    }

    const prevLen = prevRaw.length;
    const nextLen = nextText.length;

    if (nextLen === 0) {
      onChangeText('');
      return;
    }

    if (nextLen < prevLen) {
      onChangeText(prevRaw.slice(0, nextLen));
      return;
    }

    if (nextLen > prevLen) {
      const appended = nextText.slice(prevLen);
      onChangeText(prevRaw + appended);
      return;
    }

    onChangeText(prevRaw);
  };

  return (
    <View className={containerClassName ?? 'mb-6'}>
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        ref={setInputRef}
        placeholder={placeholder}
        placeholderTextColor="#909090"
        value={displayValue}
        autoFocus={autoFocus}
        editable={editable}
        onChangeText={handleChangeText}
        autoCorrect={false}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        secureTextEntry={secureTextEntry}
        selection={
          isAndroidSecure ? { start: displayValue.length, end: displayValue.length } : undefined
        }
        className="h-13 px-1 text-xl text-[#0F0F0F]"
        // Disable autofill to prevent Google Password Manager from prompting
        // Android: importantForAutofill="no" prevents autofill service from interacting with this field
        // iOS: Omitting textContentType prevents iOS from suggesting/saving passwords
        {...(Platform.OS === 'android' && secureTextEntry
          ? { importantForAutofill: 'no' as any }
          : {})}
        {...rest}
        onFocus={onFocus}
        onBlur={onBlur}
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
