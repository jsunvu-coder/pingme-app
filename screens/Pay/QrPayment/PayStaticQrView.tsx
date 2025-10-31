import { BalanceService } from 'business/services/BalanceService';
import { View, TextInput, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import PaymentAmountView from 'screens/Send/PingMe/PaymentAmountView';

type Props = {
  recipient: string;
  amount: string;
  setAmount: (val: string) => void;
};

export default function PayStaticQrView({ recipient, amount, setAmount }: Props) {
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
          balance={`$${BalanceService.getInstance().totalBalance}`}
          value={amount}
          onChange={setAmount}
        />
      </ScrollView>
    </View>
  );
}
