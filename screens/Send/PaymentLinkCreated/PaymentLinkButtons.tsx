import { View } from "react-native";
import PrimaryButton from "components/PrimaryButton";
import SecondaryButton from "components/ScondaryButton";
import { setRootScreen } from "navigation/Navigation";
import { Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentLinkButtons({
	payLink,
	passphrase,
}: {
	payLink: string;
	passphrase: string;
}) {
	const handleShare = async () => {
		try {
			await Share.share({
				message: `Here's your PingMe payment link:\n\n${payLink}\n\nPassphrase: ${passphrase}`,
			});
		} catch (err) {
			console.error("Share error:", err);
		}
	};

	const handleBackHome = () => {
		setRootScreen(["MainTab"]);
	};

	return (
		<View className="my-6">
			<View className="flex-row gap-x-6">
				<View className="flex-1">
					<SecondaryButton title="Homepage" onPress={handleBackHome} />
				</View>
				<View className="flex-1">
					<PrimaryButton title="Share Now" onPress={handleShare} />
				</View>
			</View>

<SafeAreaView edges={['bottom']}/>
		</View>

	);
}
