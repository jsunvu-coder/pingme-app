import React from "react";
import { View, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

type Props = {
	currentTier: Tier;
	currentPoints: number;
	maxPointsPerTier: number;
};

const tiers: Tier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
const { width } = Dimensions.get("window");

export default function AccountTierProgress({
	currentTier,
	currentPoints,
	maxPointsPerTier,
}: Props) {
	const activeIndex = tiers.indexOf(currentTier);

	return (
		<View className="mt-6">
			<View>
				{/* Bar */}
				<View
					style={{
						position: "absolute",
						top: "50%",
						left: 16,
						right: 16,
						height: 3,
						backgroundColor: "#FFE8E2",
						transform: [{ translateY: -1.5 }],
						zIndex: 0,
					}}
				/>

				{/* Node */}
				<View className="flex-row justify-between mt-4">
					{tiers.map((tier, i) => {
						const isActive = i <= activeIndex;

						return (
							<View key={tier} className="items-center">
								{/* Tier Label */}
								<Text
									className={`text-xs font-semibold mb-1 ${
										isActive ? "text-[#1BA75A]" : "text-gray-400"
									}`}
								>
									{tier}
								</Text>

								{/* Circle Icon */}
								<View
									className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
										isActive
											? "border-[#1BA75A] bg-[#1BA75A]"
											: "border-gray-300 bg-white"
									}`}
								>
									{isActive && (
										<Ionicons name="checkmark" size={14} color="white" />
									)}
								</View>

								{/* Points below active tier */}
								{i === activeIndex && (
									<View className="items-center mt-1">
										<View
											style={{
												width: 2,
												height: 10,
												backgroundColor: "#FD4912",
												marginBottom: 2,
											}}
										/>
										<Text className="text-[#FD4912] text-xs font-semibold">
											{currentPoints}
										</Text>
									</View>
								)}
							</View>
						);
					})}
				</View>
			</View>
		</View>
	);
}
