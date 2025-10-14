import { BalanceService } from "business/services/BalanceService";
import { View, TextInput, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import PaymentAmountView from "screens/Send/PingMe/PaymentAmountView";

type Props = {
	recipient: string;
	setRecipient: (val: string) => void;
	amount: string;
	setAmount: (val: string) => void;
	available: number;
};

export default function PayStaticQrView({
	recipient,
	setRecipient,
	amount,
	setAmount,
	available,
}: Props) {
	return (
		<View>
			<ScrollView>
				<View className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 flex-row justify-between items-center">
					<Text className="text-gray-400 mb-1 text-xl">Recipient</Text>
					<Text className="text-black mb-1 text-xl max-w-[50%]" numberOfLines={1}
						ellipsizeMode="tail">{recipient}</Text>

				</View>

				<PaymentAmountView
					balance={`$${BalanceService.getInstance().totalBalance}`}
					value={amount}
					onChange={setAmount}
				/>
			</ScrollView>
		</View>
	);
}
