import { View, Text, TouchableOpacity } from "react-native";
import CopyIcon from "assets/CopyIcon";

export default function PaymentClaimCard({
  content,
  passphrase,
}: {
  content: string,
  passphrase: string;
}) {
  return (
    <View className="bg-white rounded-2xl px-6 py-8">
      <Text className="text-gray-700 text-lg">
        {content}
      </Text>

      <View className="mt-6 border-t border-[#F5E1DC] pt-6 flex-row justify-between items-center">
        <Text className="text-gray-500 text-xl">Passphrase</Text>

        <Text className="text-xl mr-2">{passphrase}</Text>
        <TouchableOpacity className="flex-row items-center active:opacity-80">
          <CopyIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
}
