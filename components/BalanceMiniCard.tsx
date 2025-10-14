import { View, Text } from "react-native";

export default function BalanceMiniCard({ balance }: { balance: string }) {
  return (
    <View className="bg-white rounded-2xl px-5 py-3 flex-row justify-between items-center shadow-sm">
      <Text className="text-gray-500 font-medium">Current balance</Text>
      <Text className="text-lg font-bold text-gray-900">{balance}</Text>
    </View>
  );
}
