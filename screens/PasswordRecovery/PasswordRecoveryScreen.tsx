import { useState, useRef, useEffect } from "react";
import { View, ScrollView, Animated, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NavigationBar from "components/NavigationBar";
import PrimaryButton from "components/PrimaryButton";
import SecurityNotice from "./SecurityNotice";
import RecoveryInfoSection from "./RecoveryInfoSection";
import QRDisplay from "./QRDisplay";
import SaveConfirmation from "./SaveConfirmation";
import ConfirmRecoveryModal from "./ConfirmRecoveryModal";
import RecoverySuccessView from "./RecoverySuccessView";

export default function PasswordRecoveryScreen() {
	const [saved, setSaved] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const fadeAnim = useRef(new Animated.Value(0)).current;

	const handleDownload = () => {
		console.log("Download QR Code");
	};

	const handleCheckbox = (value: boolean) => {
		setSaved(value);
		if (value) setShowConfirm(true);
	};

	const handleConfirm = () => {
		setShowConfirm(false);
		setShowSuccess(true);

		fadeAnim.setValue(0);
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 600,
			useNativeDriver: true,
		}).start();
	};

	useEffect(() => {
		if (!showSuccess) fadeAnim.setValue(0);
	}, [showSuccess]);

	return (
		<View className="flex-1 bg-[#FAFAFA]">
			<SafeAreaView edges={["top"]} className="pb-4 px-4">
				<NavigationBar title="Password Recovery" />
			</SafeAreaView>

			{!showSuccess && (
				<ScrollView className="flex-1 p-6 bg-black">
					<SecurityNotice />
					<RecoveryInfoSection />
					<QRDisplay />

					<View className="mt-8 self-center">
						<PrimaryButton
							title="Download QR Code"
							onPress={handleDownload}
						/>
					</View>

					<SaveConfirmation saved={saved} onToggle={handleCheckbox} />

					<View className="h-24" />
				</ScrollView>
			)}

			{showSuccess && (
				<RecoverySuccessView />
			)}

			{/* Bottom Sheet Modal */}
			<ConfirmRecoveryModal
				visible={showConfirm}
				onClose={() => setShowConfirm(false)}
				onConfirm={handleConfirm}
			/>
		</View>
	);
}
