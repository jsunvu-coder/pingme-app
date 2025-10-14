import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const AdCard = () => {
	return <View className="bg-white rounded-2xl p-5 mt-10">
		<Text className="text-gray-800 text-base">
			Sent money faster than a text with{" "}
			<Text className="font-semibold">@PingMe</Text>
		</Text>
		<Text className="text-[#FD4912] font-medium mt-1">#JustPinged</Text>

		<View className="bg-gray-100 rounded-xl mt-4 h-40 items-center justify-center">
			<Ionicons name="image-outline" size={48} color="#B0B0B0" />
		</View>
	</View>
}