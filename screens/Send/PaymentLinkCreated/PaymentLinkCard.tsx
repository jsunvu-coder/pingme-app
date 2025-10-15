import { View, Text, TouchableOpacity, Platform, ToastAndroid, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CopyIcon from "assets/CopyIcon";
import * as Clipboard from "expo-clipboard";

export default function PaymentLinkCard({
	payLink,
	amount,
	openLinkVisible = false
}: {
	payLink: string;
	amount: number;
	openLinkVisible: boolean
}) {
	const handleCopy = async () => {
		await Clipboard.setStringAsync(payLink);
		if (Platform.OS === "android") {
			ToastAndroid.show("Copied to clipboard", ToastAndroid.SHORT);
		} else {
			Alert.alert("Copied", "Payment link copied to clipboard.");
		}
	};

	const handleOpenLink = async () => {
		try {
			const supported = await Linking.canOpenURL(payLink);
			if (supported) {
				await Linking.openURL(payLink);
			} else {
				Alert.alert("Error", "Cannot open this link.");
			}
		} catch (err) {
			console.error("Open link failed:", err);
			Alert.alert("Error", "Unable to open the payment link.");
		}
	};

	return (
		<View className="bg-white rounded-2xl p-6">
			<View className="flex-row pr-10">
				<View className="flex-1">
					<Text className="text-2xl font-semibold text-gray-800 mb-3">
						Your Payment Link is ready to share
					</Text>
					<View className="flex-row items-center">
						<Text className="text-2xl" numberOfLines={1} ellipsizeMode="middle">
							{payLink}
						</Text>

						<TouchableOpacity
							className="ml-4 active:opacity-80"
							onPress={handleCopy}
						>
							<CopyIcon />
						</TouchableOpacity>
					</View>
				</View>


			</View>

			{/* Divider + Amount */}
			<View className="mt-6 border-t border-[#FFDBD0] pt-6 flex-row justify-between items-center">
				<Text className="text-gray-500 text-lg">Amount</Text>
				<Text className="text-2xl font-semibold mr-1">
					${amount.toFixed(2)}
				</Text>
				{openLinkVisible && <TouchableOpacity onPress={handleOpenLink}>
					<Ionicons name="open-outline" size={24} color="#FD4912" />
				</TouchableOpacity>}
				{!openLinkVisible && <View />}
			</View>
		</View>
	);
}
