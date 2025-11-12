import { View, Text } from 'react-native';
import WalletAddIcon from 'assets/WalletAddIcon';

export default function DepositHeader() {
  return (
    <View>
      {/* Main Header Content */}
      <View className="mt-10 items-center px-6">
        <WalletAddIcon size={72} />

        <Text className="mx-6 mt-6 text-center text-3xl font-bold text-gray-700">
          Deposit USDC to the address below
        </Text>

        <Text className="mt-6 text-center text-xl leading-6 text-gray-500">
          Please deposit <Text className="font-semibold">USDC (Tether)</Text> on the{' '}
          <Text className="font-semibold">Ethereum network</Text> to the exact wallet address shown.
        </Text>
      </View>
    </View>
  );
}
