import { View } from "react-native";
import PrimaryButton from "components/PrimaryButton";
import SecondaryButton from "components/ScondaryButton";
import { setRootScreen } from "navigation/Navigation";
import { Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ButtonProps = {
  payLink: string;
  passphrase?: string;
  linkType: 'payment' | 'request';
};

export default function PaymentLinkButtons({ payLink, passphrase, linkType }: ButtonProps) {
	const handleShare = async () => {
		try {
      const descriptor = linkType === 'payment' ? 'payment' : 'payment request';
      let message = `Here's your PingMe ${descriptor} link:\n\n${payLink}`;
      if (passphrase) {
        message += `\n\nPassphrase: ${passphrase}`;
      }
			await Share.share({ message: message, });
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

			<SafeAreaView edges={['bottom']} />
		</View>

	);
}
