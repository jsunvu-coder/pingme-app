import { View, Text } from 'react-native';
import DollarIcon from 'assets/DollarIcon';
import AuthInput from 'components/AuthInput';

type Props = {
  value: string;
  onChange: (text: string) => void;
  balance: string;
  mode: 'send' | 'request';
  autoFocus?: boolean;
  isLoading?: boolean;
};

export default function PaymentAmountView({
  value,
  onChange,
  balance,
  mode,
  autoFocus = false,
  isLoading,
}: Props) {
  const balanceLabel = mode === 'request' ? 'Current' : 'Available';
  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        <DollarIcon />
        <Text className="text-xl text-gray-900">
          {balanceLabel}: {balance}
        </Text>
      </View>

      <AuthInput
        icon={<View />}
        value={value}
        onChangeText={onChange}
        placeholder="Amount"
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        editable={!isLoading}
      />
    </View>
  );
}
