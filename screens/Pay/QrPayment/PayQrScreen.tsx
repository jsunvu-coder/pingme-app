import { useState } from "react";
import {
	View,
	Text,
	ScrollView,
	Platform,
	KeyboardAvoidingView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import ModalContainer from "components/ModalContainer";
import PrimaryButton from "components/PrimaryButton";
import WalletSendIcon from "assets/WalletSendIcon";
import CloseButton from "components/CloseButton";
import { QrPaymentData, rawOpen, rawPredefined } from "./QrPaymentModel";
import PayMerchantQrView from "./PayMerchantQrView";
import PayStaticQrView from "./PayStaticQrView";
import { SafeAreaView } from "react-native-safe-area-context";


type RootStackParamList = {
	PayQrScreen: { qrData: QrPaymentData };
};

export default function PayQrScreen() {
	const route = useRoute<RouteProp<RootStackParamList, "PayQrScreen">>();
	//   const { qrData } = route.params;
	const qrData = rawPredefined

	const isPredefined = qrData.mode === "predefined";
	const [amount, setAmount] = useState(qrData.amount ?? "");
	const [available] = useState(1000);

	const handlePayNow = () => {
		console.log("💳 Processing payment:", {
			...qrData,
			amount,
		});
		// PayService.getInstance().pay(...)
	};

	return (
		<ModalContainer>
			<View className="flex-1 bg-[#fafafa] rounded-t-[24px] overflow-hidden">
				<View className="absolute top-6 right-6 z-10">
					<CloseButton />
				</View>


				<View className="px-6 pt-10 pb-8">
					<View className="items-center mb-6 mt-12">
						<WalletSendIcon />
					</View>

					<Text className="text-3xl font-bold text-center text-black mb-8">
						You’re about to send
					</Text>

					{isPredefined ? (
						<PayMerchantQrView
							amount={`$${qrData.amount}`}
							method={qrData.method}
							merchant={qrData.merchant}
							invoice={qrData.invoiceNo}
						/>
					) : (
						<PayStaticQrView
							recipient={qrData.recipient}
							setRecipient={() => { }}
							amount={amount}
							setAmount={setAmount}
							available={available}
						/>
					)}
				</View>

				<View className="flex-1" />

				<SafeAreaView className="m-6">
					<PrimaryButton
						title="Pay Now"
						onPress={handlePayNow}
						disabled={!isPredefined && (!amount || Number(amount) <= 0)}
					/>
				</SafeAreaView>
			</View>
		</ModalContainer>
	);
}
