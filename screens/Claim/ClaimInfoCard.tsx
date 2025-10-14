import { View, Text } from "react-native";

export const ClaimInfoCard = ({
	amount,
	sender,
}: {
	amount: string;
	sender: string;
}) => (
	<View className="bg-white  rounded-2xl p-6">
		<View className="flex-row justify-between mb-2">
			<Text className="text-gray-500 text-xl">Amount</Text>
			<Text className="text-black text-2xl">{amount}</Text>
		</View>
		<View className="flex-row justify-between mt-4">
			<Text className="text-gray-500 text-xl">Sender</Text>
			<Text className="text-black text-2xl" numberOfLines={1}>
				{sender}
			</Text>
		</View>
	</View>
);
