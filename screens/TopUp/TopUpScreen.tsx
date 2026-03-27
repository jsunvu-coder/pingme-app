import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import NavigationBar from 'components/NavigationBar';
import WalletAddIcon from 'assets/WalletAddIcon';
import OutlineButton from 'components/OutlineButton';
import TopupBridgeWalletIcon from 'assets/Topup/BridgeWalletIcon';
import { push } from 'navigation/Navigation';
import TopupTransferCryptoIcon from 'assets/Topup/TransferCryptoIcon';
import TopupAddHKDIcon from 'assets/Topup/AddHKDIcon';
import { showFlashMessage } from 'utils/flashMessage';

const METHODS = [
  {
    name: 'Bridge from another wallet',
    description:
      'Move crypto from your existing wallet to PingMe. You’ll complete the bridge or swap in your wallet app.',
    icon: <TopupBridgeWalletIcon size={40} color="#FD4912" />,
    button: {
      title: 'Choose Your Wallet',
      onPress: () => {
        push('BridgeFromAnotherWalletScreen');
      },
    },
  },
  {
    name: 'Transfer crypto to PingMe',
    description: 'Get your PingMe wallet address and send funds on Monad network.',
    icon: <TopupTransferCryptoIcon size={40} color="#FD4912" />,
    button: {
      title: 'Get Address',
      onPress: () => {
        push('DepositScreen');
      },
    },
  },
  {
    name: 'Add HKD via FPS',
    description: 'Send HKD using FPS to top up your PingMe balance — fast and local.',
    icon: <TopupAddHKDIcon size={40} color="#FD4912" />,
    button: {
      title: 'Top Up with FPS',
      onPress: () => {
        showFlashMessage({
          title: 'Coming soon',
          message: 'This feature is coming soon',
          type: 'info',
        });
      },
    },
  },
];

export default function TopUpScreen() {
  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title="Top Up Balance" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          flex: 1,
          paddingBottom: 40,
          paddingVertical: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {
          METHODS.map((method) => (
            <TopupMethodItem key={method.name} method={method} />
          ))
        }
      </ScrollView>
    </View>
  );
}

const TopupMethodItem = ({ method }: { method: (typeof METHODS)[0] }) => {
  return (
    <View className="mb-4 bg-white p-6">
      <View className="flex-row items-center">
        {method.icon}

        <Text className="ml-4 flex-1 text-[16px] font-medium text-[#FD4912]">
          {method.name}
        </Text>
      </View>

      <Text className="mt-4 text-base leading-6 text-black">
        {method.description}
      </Text>

      <OutlineButton
        title={method.button.title}
        onPress={method.button.onPress}
        fontWeight="bold"
        fontSize={16}
        className="mt-4 h-14 items-center justify-center rounded-full border-2 border-[#FD4912] bg-white"
      />
    </View>
  );
};
