import { View, Text, Image } from "react-native";

export default function QRDisplay() {
  return (
    <View className="mt-8 bg-white rounded-2xl h-64 w-64 flex-1 items-center self-center justify-center">
      <Text className="text-gray-400">[ QR Code Here ]</Text>
    </View>
  );
}
