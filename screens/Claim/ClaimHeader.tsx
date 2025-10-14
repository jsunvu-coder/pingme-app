import { View, Text } from 'react-native';
import WalletLockIcon from 'assets/WalletLockIcon';

export const ClaimHeader = () => (
  <View className="mt-4 items-center">
    <WalletLockIcon />
    <Text className="mt-6 text-center text-3xl font-bold text-black">
      Enter passphrase to{'\n'}claim the payment
    </Text>
  </View>
);
