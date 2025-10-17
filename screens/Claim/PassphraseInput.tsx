import { View } from 'react-native';
import AuthInput from 'components/AuthInput';
import KeyIcon from 'assets/KeyIcon';

export const PassphraseInput = ({
  value,
  onChangeText,
  error,
  errorMessage,
}: {
  value: string;
  onChangeText: (v: string) => void;
  error?: boolean;
  errorMessage?: string;
}) => (
  <View className="rounded-2xl bg-white p-6">
    <AuthInput
      icon={<KeyIcon />}
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter passphrase"
      error={error}
      errorMessage={errorMessage}
    />
  </View>
);
