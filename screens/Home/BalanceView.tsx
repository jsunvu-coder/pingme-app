import { View, Text, TouchableOpacity } from "react-native";
import PlusIcon from "assets/PlusIcon";
import { BalanceEntry } from "business/Types";
import { push } from "navigation/Navigation";

export default function BalanceView({
  balance,
}: {
  balance: string;
  tokens?: BalanceEntry[];
}) {
  return (
    <View className="px-6 mt-12">
      <Text className="text-white text-sm opacity-80 mb-1">
        Current Balance
      </Text>

      <View className="flex-row justify-between items-center">
        <Text className="text-white text-[52px] font-extrabold">{balance}</Text>

        <TouchableOpacity className="rounded-full" onPress={() => push("DepositScreen")}>
          <PlusIcon color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
