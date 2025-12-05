import { View } from 'react-native';
import AuthInput from 'components/AuthInput';
import KeyIcon from 'assets/KeyIcon';

export const PassphraseInput = ({
  value,
  onChangeText,
  error,
  errorMessage,
  disabled = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
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
      autoFocus
      errorMessage={errorMessage}
      editable={!disabled}
    />
  </View>
);
