import { View, Text } from "react-native";
import DollarIcon from "assets/DollarIcon";
import AuthInput from "components/AuthInput";

type Props = {
  value: string;
  onChange: (text: string) => void;
  balance: string;
};

export default function PaymentAmountView({ value, onChange, balance }: Props) {

  return (
    <View className="mt-6">
      <View className="flex-row justify-between items-center mb-2">
        <DollarIcon />
        <Text className="text-gray-900 text-xl">Available {balance}</Text>
      </View>

       <AuthInput
        icon={<View />}
        value={value}
        onChangeText={onChange}
        placeholder="Amount"
      />

    </View>
  );
}
