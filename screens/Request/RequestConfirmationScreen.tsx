import { useState } from "react";
import { View, Text } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import ModalContainer from "components/ModalContainer";
import PrimaryButton from "components/PrimaryButton";
import { LOCKBOX_DURATION } from "business/Constants";
import CloseButton from "components/CloseButton";
import PaymentSummaryCard from "./PaymentSummaryCard";
import WalletRequestIcon from "assets/WalletRequestIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import { push } from "navigation/Navigation";

type RequestConfirmationParams = {
	amount: number;
	displayAmount: string;
	recipient?: string;
	channel: "Email" | "Link";
	lockboxDuration?: number;
};

type RootStackParamList = {
	RequestConfirmationScreen: RequestConfirmationParams;
};

export default function RequestConfirmationScreen() {
	const route = useRoute<RouteProp<RootStackParamList, "RequestConfirmationScreen">>();
	const params = route.params || {};

	const {
		amount = 0,
		displayAmount = "$0.00",
		recipient,
		channel = "Email",
		lockboxDuration = LOCKBOX_DURATION,
	} = params;

	const [loading, setLoading] = useState(false);

	const handleSendingRequest = async () => {
		setLoading(true);

		try {
			if (channel === "Email" && recipient) {
				// ✅ Case 1: Email request
				push("RequestSuccessScreen", {
					amount,
					displayAmount,
					recipient,
					channel,
					lockboxDuration,
				});
			} else {
				// ✅ Case 2: Link request (no recipient)
				// Simulate generated link data
				const generatedLink = `https://app.pingme.xyz/claim?lockboxSalt=0x${Math.random()
					.toString(16)
					.slice(2)
					.padEnd(64, "a")}`;

				const durationInDays = Math.ceil(lockboxDuration / 86400); // convert seconds → days if needed

				push("PaymentLinkCreatedScreen", {
					payLink: generatedLink,
					amount,
					duration: durationInDays,
				});
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<ModalContainer>
			<View className="flex-1 bg-[#fafafa] rounded-t-[24px] overflow-hidden">
				<View className="absolute top-6 right-6 z-10">
					<CloseButton />
				</View>

				<View className="px-6 pt-10 pb-8">
					<View className="items-center mb-6 mt-2">
						<WalletRequestIcon />
					</View>

					<Text className="text-4xl font-bold text-center text-black mb-8">
						You’re about to request a payment
					</Text>

					<PaymentSummaryCard
						amount={displayAmount}
						recipient={recipient ?? "N/A"}
						lockboxDuration={lockboxDuration}
					/>
				</View>

				<View className="flex-1" />

				<PrimaryButton
					title={channel === "Email" ? "Send Payment Request" : "Confirm Request"}
					loading={loading}
					className="mx-6 mb-6"
					onPress={handleSendingRequest}
				/>

				<SafeAreaView edges={["bottom"]} />
			</View>
		</ModalContainer>
	);
}
