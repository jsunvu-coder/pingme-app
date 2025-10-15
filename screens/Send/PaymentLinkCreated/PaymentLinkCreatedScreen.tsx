import { useRoute } from "@react-navigation/native";
import LinkIcon from "assets/LinkIcon";
import { ScrollView, Text, View } from "react-native";
import PaymentClaimCard from "components/PaymentClaimCard";
import PaymentLinkCard from "./PaymentLinkCard";
import PaymentLinkButtons from "./PaymentLinkButtons";
import { SafeAreaView } from "react-native-safe-area-context";

type PaymentLinkParams = {
	payLink: string;
	amount: number;
	duration: number;
	passphrase: string;
};

export default function PaymentLinkCreatedScreen() {
	const route = useRoute();
	const { payLink = "https://docs.google.com/document/d/1xvHi2jkwX73Qfl_b2WrA0D1NRJjxDFJmkcUqRK2lCTY/edit?tab=t.zkgwbszcpyr", amount = 10, duration = 7, passphrase } =
		(route.params as PaymentLinkParams) || {};

	return (
		<View className="flex-1 px-6 bg-[#FAFAFA]">
			<SafeAreaView edges={["top"]} />

			<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
				<Header />
				<View className="my-6">
					<PaymentLinkCard payLink={payLink} amount={amount} openLinkVisible={passphrase !== undefined}/>
				</View>
				{passphrase && <PaymentClaimCard passphrase={passphrase} content={`Recipient will have ${duration} days to claim.`} />}
			</ScrollView>

			<PaymentLinkButtons payLink={payLink} passphrase={passphrase} />
		</View>
	);
}

function Header() {
	return (
		<View className="items-center mt-10">
			<View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center">
				<LinkIcon />
			</View>

			<Text className="text-3xl font-bold text-center text-black mt-6">
				Payment Link Created
			</Text>
		</View>
	);
}
