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

const normalizeDecimalInput = (text: string): string => {
  const raw = (text ?? '').toString();
  if (!raw) return '';

  const cleaned = raw.replace(/\s/g, '').replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const decimalIndex = Math.max(lastDot, lastComma);
  if (decimalIndex === -1) return cleaned;

  let out = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch >= '0' && ch <= '9') out += ch;
    else if (i === decimalIndex) out += '.';
  }
  return out;
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
        onChangeText={(text) => onChange(normalizeDecimalInput(text))}
        placeholder="Amount"
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        editable={!isLoading}
      />
    </View>
  );
}
