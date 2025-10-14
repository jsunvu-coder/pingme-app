import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { goBack } from "navigation/Navigation";

export default function QrHeader() {
	return (
		<View className="flex-row items-center justify-between px-6 pt-4">
			<TouchableOpacity onPress={() => goBack()}>
				<Ionicons name="chevron-back" size={28} color="#FD4912" />
			</TouchableOpacity>

			<Text className="text-lg font-semibold text-gray-800">QR Code</Text>

			<View className="w-8" /> {/* placeholder for center alignment */}
		</View>
	);
}
