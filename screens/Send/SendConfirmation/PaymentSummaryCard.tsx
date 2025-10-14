import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
	lockboxDuration,
}: Props) {
	return (
		<View className="bg-white rounded-2xl p-6 mb-6">
			{/* Amount */}
			<View className="flex-row justify-between items-center mb-3">
				<SummaryTitle>Amount</SummaryTitle>
				<SummaryValue>{amount}</SummaryValue>
			</View>

			{/* Recipient */}
			{recipient ? (
				<View className="flex-row justify-between items-center mb-3">
					<SummaryTitle>Recipient</SummaryTitle>
					<SummaryValue>{recipient}</SummaryValue>
				</View>
			) : null}

			{/* Lockbox Duration */}
			<View className="flex-row justify-between items-center mb-4">
				<SummaryTitle>Lockbox duration</SummaryTitle>
				<SummaryValue>{lockboxDuration} Days</SummaryValue>
			</View>

			{/* Info Text */}
			<View className="flex-row items-start mt-1">
				<Ionicons
					name="information-circle-sharp"
					size={18}
					color="#3B82F6"
					style={{ marginRight: 6, marginTop: 2 }}
				/>
				<Text className="text-gray-600 text-md leading-relaxed flex-1">
					The payment link will expire if unclaimed within the stated period.
					Funds will be returned to your balance.
				</Text>
			</View>
		</View>
	);
}
