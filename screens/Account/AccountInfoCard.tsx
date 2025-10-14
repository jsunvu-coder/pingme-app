import { View, Text } from "react-native";

type Props = {
	email: string;
	balance: string;
};

export default function AccountInfoCard({ email, balance }: Props) {
	return (
		<View className="mt-12">
			<Text className="text-gray-700 text-xl">{email}</Text>

			<View className="bg-gray-100 rounded-xl p-4 mt-4 flex-row items-center justify-between">
				<Text className="text-gray-500 text-lg">Current balance</Text>
				<Text className="text-2xl font-bold mt-1">{balance}</Text>
			</View>
		</View>
	);
}
