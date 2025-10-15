import React from "react";
import { View, Text } from "react-native";

type Props = {
	amount: string;
	recipient?: string;
	lockboxDuration: number;
};


const SummaryTitle = ({ children }: { children: React.ReactNode }) => (
	<Text className="text-gray-500 flex-1 text-lg">{children}</Text>
);

const SummaryValue = ({
	children,
}: {
	children: React.ReactNode;
}) => (
	<Text
		className="text-black text-lg flex-1 font-normal"
		numberOfLines={1}
		ellipsizeMode="tail"
	>
		{children}
	</Text>
);


export default function PaymentSummaryCard({
	amount,
	recipient,
}: Props) {
	return (
		<View className="bg-white rounded-2xl p-6 mb-6">
			<View className="flex-row justify-between items-center mb-3">
				<SummaryTitle>Amount</SummaryTitle>
				<SummaryValue>{amount}</SummaryValue>
			</View>

			{recipient ? (
				<View className="flex-row justify-between items-center mb-3">
					<SummaryTitle>Recipient</SummaryTitle>
					<SummaryValue>{recipient}</SummaryValue>
				</View>
			) : null}

		</View>
	);
}
