import ExclaiminationIcon from "assets/ExclaiminationIcon";
import { View, Text } from "react-native";

export default function SecurityNotice() {
	return (
		<View className="flex-row bg-red-600 rounded-2xl">
			<View className="mt-6 ml-4">
				<ExclaiminationIcon />
			</View>
			<View className="p-4 flex-1">
				<Text className="text-white text-lg font-semibold mb-1">SECURITY NOTICE</Text>
				<Text className="text-white text-md leading-5">
					Anyone with access to this QR code can gain full access to your account.
					Ensure it is kept strictly confidential.
				</Text>
			</View>
		</View>
	);
}
