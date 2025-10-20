import { View, Text } from 'react-native';
import WalletLockIcon from 'assets/WalletLockIcon';

type Props = {
  email?: string;
};

export const ClaimHeader = ({ email }: Props) => (
  <View className="mt-4 items-center">
    <WalletLockIcon />
    <Text className="mt-6 text-center text-3xl font-bold text-black">
      {email
        ? `Enter passphrase to\nclaim the payment for ${email}`
        : `Enter passphrase to\nclaim the payment`}
    </Text>
  </View>
);
