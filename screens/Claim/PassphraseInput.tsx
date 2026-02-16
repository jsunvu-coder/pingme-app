import { View } from 'react-native';
import AuthInput from 'components/AuthInput';
import KeyIcon from 'assets/KeyIcon';

export const PassphraseInput = ({
  value,
  onChangeText,
  error,
  errorMessage,
  disabled = false,
  helperText,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  helperText?: string;
}) => (
  <View className="rounded-2xl bg-white p-6">
    <AuthInput
      icon={<KeyIcon />}
      value={value}
      onChangeText={(v) => {
        if (disabled) return;
        onChangeText(v);
      }}
      placeholder="Enter passphrase"
      error={error}
      helperText={helperText}
      autoFocus
      errorMessage={errorMessage}
      editable={!disabled}
    />
  </View>
);
