import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/native";
import {
	ScrollView,
	View,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { push } from "navigation/Navigation";

import SendRequestTab from "./SendRequestTab";
import EmailRecipientSection from "./EmailRecipientSection";
import ChannelSelectView from "./ChannelSelectView";
import PaymentAmountView from "./PaymentAmountView";
import PrimaryButton from "components/PrimaryButton";
import HeaderView from "components/HeaderView";
import { BalanceService } from "business/services/BalanceService";
import { LOCKBOX_DURATION } from "business/Constants";
import ContactPickerModal from "./ContactList";
import { RecentEmailStorage } from "./RecentEmailStorage";

export default function PingMeScreen() {
	const route = useRoute<any>();
	const [mode, setMode] = useState<"send" | "request">("send");
	const [activeChannel, setActiveChannel] = useState<"Email" | "Link">("Email");
	const [amount, setAmount] = useState("1");
	const [email, setEmail] = useState("pingme02@test.com");
	const [isPickerVisible, setPickerVisible] = useState(false);

	// ✅ Handle params passed from QR code navigation
	useEffect(() => {
		if (route.params) {
			const { mode: paramMode, email: paramEmail, amount: paramAmount } =
				route.params;

			if (paramMode && (paramMode === "send" || paramMode === "request")) {
				setMode(paramMode);
			}

			if (paramEmail && typeof paramEmail === "string") {
				setEmail(paramEmail);
			}

			if (paramAmount && !isNaN(Number(paramAmount))) {
				setAmount(String(paramAmount));
			}
		}
	}, [route.params]);

	const handleContinue = async () => {
		const numericAmount = parseFloat(amount);
		if (!numericAmount || numericAmount <= 0) {
			Alert.alert("Invalid amount", "Please enter a valid payment amount.");
			return;
		}

		let recipient = "";
		if (activeChannel === "Email") {
			if (!email.trim()) {
				Alert.alert("Missing email", "Please enter a recipient email address.");
				return;
			}
			recipient = email.trim();

			// 💾 Save email to local storage
			await RecentEmailStorage.save(recipient);
		}

		push("SendConfirmationScreen", {
			amount: numericAmount,
			displayAmount: `$${numericAmount.toFixed(2)}`,
			recipient,
			channel: activeChannel,
			lockboxDuration: LOCKBOX_DURATION,
			mode,
		});
	};

	return (
		<View className="flex-1 bg-white">
			<SafeAreaView edges={["top"]} />

			<HeaderView title="Ping Now" variant="light" />

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					className="flex-1 px-5 pt-5"
					contentContainerStyle={{ paddingBottom: 40 }}
					keyboardShouldPersistTaps="handled"
				>
					<SendRequestTab mode={mode} onChange={setMode} />

					<ChannelSelectView
						active={activeChannel}
						onChange={setActiveChannel}
					/>

					{activeChannel === "Email" && (
						<EmailRecipientSection
							email={email}
							setEmail={setEmail}
							onPressContactList={() => setPickerVisible(true)}
						/>
					)}

					<ContactPickerModal
						visible={isPickerVisible}
						onClose={() => setPickerVisible(false)}
						onSelect={(selectedEmail) => {
							setEmail(selectedEmail);
							setPickerVisible(false);
						}}
					/>

					<View className="mt-8">
						<PaymentAmountView
							balance={`$${BalanceService.getInstance().totalBalance}`}
							value={amount}
							onChange={setAmount}
						/>
					</View>

					<PrimaryButton title="Continue" className="mt-6" onPress={handleContinue} />
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
