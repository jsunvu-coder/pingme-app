import React, { forwardRef, memo, useCallback, useMemo, useRef, useState } from 'react';
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

const MASK_CHAR = '•';
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
  const savedFirstCharRef = useRef<string | null>(null);

  const setInputRef = (node: TextInput | null) => {
    inputRef.current = node;

    if (!ref) return;
    if (typeof ref === 'function') {
      ref(node);
      return;
    }
    (ref as React.MutableRefObject<TextInput | null>).current = node;
  };

  const handleChangeText = useCallback(
    (text: string) => {
      if (
        Platform.OS === 'android' &&
        secureTextEntry &&
        value?.length === 2 &&
        text.length < value.length
      ) {
        // save the first character when deleting from 2 to 1
        savedFirstCharRef.current = value[0];
        onChangeText(MASK_CHAR);
        return;
      }

      // When user re-enters from 1 character (MASK_CHAR) to 2 characters
      if (
        Platform.OS === 'android' &&
        secureTextEntry &&
        value === MASK_CHAR &&
        text.length === 2 &&
        savedFirstCharRef.current
      ) {
        // If text[0] is MASK_CHAR, then text[1] is the new character
        // If text[0] is not MASK_CHAR, then text[0] is the new character and text[1] is the next character
        if (text[0] === MASK_CHAR) {
          // Replace MASK_CHAR with the saved character + new character
          onChangeText(savedFirstCharRef.current + text[1]);
        } else {
          // MASK_CHAR has been replaced, use the saved character + new character
          onChangeText(savedFirstCharRef.current + text[0]);
        }
        savedFirstCharRef.current = null;
        return;
      }

      // Reset saved char nếu value không còn là MASK_CHAR hoặc length > 2
      if (value !== MASK_CHAR || text.length > 2) {
        savedFirstCharRef.current = null;
      }

      onChangeText(text);
    },
    [secureTextEntry, value, onChangeText]
  );

  return (
    <View className={containerClassName ?? 'mb-6'}>
      {icon && <View className="mb-2">{icon}</View>}

      <TextInput
        ref={setInputRef}
        placeholder={placeholder}
        placeholderTextColor="#909090"
        autoFocus={autoFocus}
        editable={editable}
        secureTextEntry={secureTextEntry}
        onChangeText={handleChangeText}
        keyboardType={keyboardType}
        value={value}
        {...rest}
        {...(secureTextEntry ? { multiline: false } : {})}
        autoCapitalize={'none'}
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="oneTimeCode"
        importantForAutofill="no"
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
