import { View, Text } from 'react-native';
import DollarIcon from 'assets/DollarIcon';
import AuthInput from 'components/AuthInput';
import { STABLE_TOKENS, TOKENS } from 'business/Constants';
import MonadIcon from 'assets/MonadIcon';

type Props = {
  value: string;
  onChange: (text: string) => void;
  balance: string;
  mode?: 'send' | 'request';
  autoFocus?: boolean;
  isLoading?: boolean;
  selectedToken: keyof typeof TOKENS;
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
  selectedToken = 'USDC',
}: Props) {
  const balanceLabel = mode === 'request' ? 'Current' : 'Available';
  const isStablecoin = STABLE_TOKENS.includes(selectedToken);
  return (
    <View className="mt-6">
      <View className="mb-2 flex-row items-center justify-between">
        {isStablecoin ? <DollarIcon /> : <MonadIcon width={24} height={24} />}
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
