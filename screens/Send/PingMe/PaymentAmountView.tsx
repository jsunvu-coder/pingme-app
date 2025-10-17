import { View, Text } from 'react-native';
import DollarIcon from 'assets/DollarIcon';
import AuthInput from 'components/AuthInput';

type Props = {
  value: string;
  onChange: (text: string) => void;
  balance: string;
};

export default function PaymentAmountView({ value, onChange, balance }: Props) {
  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        <DollarIcon />
        <Text className="text-xl text-gray-900">Available {balance}</Text>
      </View>

      <AuthInput
        icon={<View />}
        value={value}
        onChangeText={onChange}
        placeholder="Amount"
        keyboardType="number-pad"
      />
    </View>
  );
}
