import { ScrollView, Text, View } from 'react-native';

import NavigationBar from 'components/NavigationBar';
import OutlineButton from 'components/OutlineButton';
import WithdrawlIcon from 'assets/WithdrawlIcon';
import TopupAddHKDIcon from 'assets/Topup/AddHKDIcon';
import { push } from 'navigation/Navigation';
import { t } from 'i18n';

const METHODS = [
  {
    name: 'Withdraw to wallet',
    description:
      'Send crypto from PingMe to any wallet address on the Monad network.',
    icon: <WithdrawlIcon width={40} height={40} />,
    button: {
      title: 'Withdraw Now',
      onPress: () => {
        push('WithdrawToWalletScreen');
      },
    },
  },
  {
    name: 'Sell Crypto via Offramp',
    description: 'Convert your crypto to local currency and receive it in your bank account.',
    icon: <TopupAddHKDIcon size={40} color="#FD4912" />,
    button: {
      title: 'Sell Now',
      onPress: () => {
        push('OfframpCurrencyScreen');
      },
    },
  },
];

export default function WithdrawScreen() {
  return (
    <View className="flex-1 bg-[#fafafa]">
      <NavigationBar title={t('WITHDRAW_FUNDS', undefined, 'Withdraw Funds')} />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          flex: 1,
          paddingBottom: 40,
          paddingVertical: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {METHODS.map((method) => (
          <WithdrawMethodItem key={method.name} method={method} />
        ))}
      </ScrollView>
    </View>
  );
}

const WithdrawMethodItem = ({ method }: { method: (typeof METHODS)[0] }) => {
  return (
    <View className="mb-4 rounded-2xl bg-white p-6">
      <View className="flex-row items-center">
        {method.icon}

        <Text className="ml-4 flex-1 text-[16px] font-medium text-[#FD4912]">{method.name}</Text>
      </View>

      <Text className="mt-4 text-base leading-6 text-black">{method.description}</Text>

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
