import { View, Text, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import WalletAddIcon from "assets/WalletAddIcon";
import CopyIcon from "assets/CopyIcon";
import WarningBox from "./WarningBox";

interface Props {
	address: string;
}

export default function DepositAddressCard({ address }: Props) {
	const handleCopy = async () => {
		await Clipboard.setStringAsync(address);
	};

	return (
		<View className="bg-white rounded-2xl p-6 mt-8">
			<View className="flex-row items-center">
				<View className="flex-1">
					<WalletAddIcon size={32} color="#000" />

					<Text
						className="text-gray-900 text-2xl mt-6"
						numberOfLines={1}
						ellipsizeMode="middle">
						{address}
					</Text>
				</View>

				<TouchableOpacity onPress={handleCopy} activeOpacity={0.7} >
					<CopyIcon />
				</TouchableOpacity>
			</View>

			{/* Separator */}
			<View className="h-1 bg-gray-200 my-6" />

			<WarningBox />
		</View>
	);
}
