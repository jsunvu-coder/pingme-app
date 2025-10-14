import { View, Text, TouchableOpacity } from "react-native";
import AccountTierProgress from "./AccountTierProgress";

type Props = {
	pointsToNextTier: number;
	currentTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
	onHowToEarn?: () => void;
};

export default function AccountTierView({
	pointsToNextTier,
	currentTier,
	onHowToEarn,
}: Props) {
	const tiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

	return (
		<View className="mt-4">
			<View className="flex-row justify-between items-center">
				<Text className="text-gray-600">
					Earn {pointsToNextTier} Points to reach next tier
				</Text>
				<TouchableOpacity onPress={onHowToEarn}>
					<Text className="text-[#FD4912] font-medium">How to earn</Text>
				</TouchableOpacity>
			</View>

			<AccountTierProgress
				currentTier="BRONZE"
				currentPoints={10}
				maxPointsPerTier={100}
			/>

		</View>
	);
}
