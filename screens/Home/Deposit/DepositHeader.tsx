import { View, Text } from "react-native";
import WalletAddIcon from "assets/WalletAddIcon";

export default function DepositHeader() {
	return (
		<View>
			{/* Main Header Content */}
			<View className="items-center mt-10 px-6">
				<WalletAddIcon size={72}/>

				<Text className="text-center text-gray-700 mt-6 text-3xl font-bold mx-6">
					Deposit USDT to the address below
				</Text>

				<Text className="text-center text-xl text-gray-500 mt-6 leading-6">
					Please deposit{" "}
					<Text className="font-semibold">USDT (Tether)</Text> on the{" "}
					<Text className="font-semibold">Ethereum network</Text> to the exact
					wallet address shown.
				</Text>
			</View>
		</View>
	);
}
