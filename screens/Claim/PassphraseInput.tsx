import { View } from 'react-native';
import AuthInput from 'components/AuthInput';
import LockIcon from 'assets/LockIcon';

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
      icon={<LockIcon />}
      value={value}
      onChangeText={onChangeText}
      placeholder="Enter passphrase"
      error={error}
      errorMessage={errorMessage}
    />
  </View>
);
