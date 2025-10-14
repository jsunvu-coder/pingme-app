import { View } from "react-native";
import PrimaryButton from "components/PrimaryButton";
import SecondaryButton from "components/ScondaryButton";
import { setRootScreen } from "navigation/Navigation";
import { Share } from "react-native";

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
		<View className="my-10">
			<View className="flex-row space-y-4">
				<SecondaryButton
					title="Homepage"
					onPress={handleBackHome}
					className="flex-1 mr-3"
				/>
				<PrimaryButton
					title="Share Now"
					onPress={handleShare}
					className="flex-1 ml-3"
				/>
			</View>
		</View>

	);
}
