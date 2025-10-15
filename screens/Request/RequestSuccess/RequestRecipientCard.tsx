import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RequestRecipientCard({
	recipient,
	amount,
}: {
	recipient: string;
	amount: number;
}) {
	return (
		<View className="bg-white rounded-2xl  px-6 py-8">
			<Text className="text-3xl text-gray-800">
				You've sent payment to{" "}
				<Text className="font-semibold">{recipient}</Text>
			</Text>

			<TouchableOpacity className="mt-2">
				<Text className="text-[#FD4912] text-lg">
					Add recipient to Contact List
				</Text>
			</TouchableOpacity>

			<View className="mt-6 border-t border-[#FFDBD0] pt-6 flex-row justify-between items-center">
				<Text className="text-gray-500 text-lg">Amount</Text>
				<Text className="text-2xl mr-1">
					${amount.toFixed(2)}
				</Text>
				{/* Keep this view to make the amount at the center */}
				<View />
			</View>
		</View>
	);
}
