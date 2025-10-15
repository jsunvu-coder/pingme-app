import { useEffect, useRef } from "react";
import {
	ScrollView,
	View,
	Text,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { push, setRootScreen } from "navigation/Navigation";
import SecondaryButton from "components/ScondaryButton";
import EnvelopIcon from "assets/EnvelopIcon";
import RequestRecipientCard from "./RequestRecipientCard";


/* ✅ Define your expected route params */
type RequestSuccessParams = {
	recipient?: string;
	amount?: number;
	passphrase?: string;
	txHash?: string;
	channel?: string;
	duration?: number;
};

export default function RequestSuccessScreen() {
	const route = useRoute<RouteProp<Record<string, RequestSuccessParams>, string>>();
	const hasNavigated = useRef(false);

	const {
		recipient = "",
		amount = 0,
	} = route.params || {};

	const handleBackToHome = () => {
		hasNavigated.current = true;
		setRootScreen(["MainTab"]);
	};


	return (
		<View className="flex-1 bg-[#FAFAFA]">
			<ScrollView className="px-6 pt-16" showsVerticalScrollIndicator={false}>
				<Header />

				<View className="my-8">
					<RequestRecipientCard recipient={recipient} amount={amount} />
				</View>
			</ScrollView>

			<View className="mb-12 mx-6">
				<SecondaryButton title="Back to Homepage" onPress={handleBackToHome} />
			</View>
		</View>
	);
}

const Header = ({ title = "Payment Request Sent" }: { title?: string }) => {
	return (
		<View className="items-center mt-16">
			<EnvelopIcon />

			<Text className="text-4xl font-bold mt-6 text-black text-center">
				{title}
			</Text>
		</View>
	);
};
