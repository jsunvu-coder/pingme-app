import { View, Text } from "react-native";
import WarningIcon from "assets/WarningIcon";

export default function WarningBox() {
	return (
		<View className="bg-red-500 rounded-2xl p-4 flex-row items-start">
			<View className="pt-1">
				<WarningIcon color="#ffffff" />
			</View>

			<View className="flex-1 ml-4">
				<Text className="text-white text-sm font-bold mb-1">WARNING</Text>
				<Text className="text-white text-sm leading-5">
					Sending any other tokens, or sending USDT to an incorrect address, or a
					different blockchain, may result in an irreversible loss of funds.
				</Text>
			</View>
		</View>
	);
}
