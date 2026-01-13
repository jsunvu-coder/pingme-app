import { BalanceService } from 'business/services/BalanceService';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';

type Props = {
  recipient: string;
  amount: string;
  setAmount: (val: string) => void;
  scanned?: boolean;
};

export default function PayStaticQrView({ recipient, amount, setAmount, scanned }: Props) {
  const shouldAutoFocus = scanned && (!amount || Number(amount) === 0);

  return (
    <View>
      <ScrollView>
        <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-white p-6">
          <Text className="mb-1 text-xl text-gray-400">Recipient</Text>
          <Text
            className="mb-1 max-w-[50%] text-xl text-black"
            numberOfLines={1}
            ellipsizeMode="tail">
            {recipient}
          </Text>
        </View>

        <PaymentAmountView
          balance={`$${BalanceService.getInstance().getStablecoinTotal()}`}
          value={amount}
          onChange={setAmount}
          autoFocus={shouldAutoFocus}
        />
      </ScrollView>
    </View>
  );
}
