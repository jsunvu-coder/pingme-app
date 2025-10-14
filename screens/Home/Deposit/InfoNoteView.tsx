import { View, Text } from "react-native";
import ClockIcon from "assets/ClockIcon";

export default function InfoNote() {
  return (
    <View className="mt-6 flex-row items-start">
      <View className="mt-2 mr-2">
        <ClockIcon />
      </View>
      <Text className="text-gray-600 text-lg ml-2 flex-1">
        Funds usually arrive within 10–15 seconds, and your balance will be
        updated automatically.
      </Text>
    </View>
  );
}
