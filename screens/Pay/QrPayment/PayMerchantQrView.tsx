import { View, Text } from "react-native";

type Props = {
	amount: string;
	method?: string;
	merchant?: string;
	invoice?: string;
};

export default function PayMerchantQrView({
	amount,
	method = "PingMe Wallet",
	merchant,
	invoice,
}: Props) {
	return (
		<View className="bg-white rounded-2xl p-5 border border-gray-100">
			<Row label="Amount" value={amount} />
			<Row label="Payment Method" value={method} />
			{merchant && <Row label="Merchant" value={merchant} />}
			{invoice && <Row label="Invoice no." value={invoice} />}
		</View>
	);
}

const Row = ({ label, value }: { label: string; value: string }) => (
	<View className="flex-row items-start mb-6">
		<Text
			className="text-gray-400 text-xl w-[40%]">
			{label}
		</Text>

		<Text
			className="text-black text-xl flex-shrink ml-6"
			numberOfLines={2}
			ellipsizeMode="tail">
			{value}
		</Text>
	</View>
);
