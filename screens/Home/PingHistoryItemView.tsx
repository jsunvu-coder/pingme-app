import { View, Text } from "react-native";
import { PingHistoryItem } from "./PingHistoryStorage";

export default function PingHistoryItemView({
	item,
	width,
}: {
	item: PingHistoryItem;
	width: number;
}) {
	const isClaimed = item.status === "claimed";

	return (
		<View
			style={{ width }}
			className="bg-white rounded-2xl p-4 mr-4 border border-gray-100"
		>
			{/* Header Row: Date + Amount */}
			<View className="flex-row justify-between items-center mb-1">
				<Text className="text-gray-400 text-xs">{formatDate(item.time)}</Text>
				<Text
					className={`text-lg font-semibold ${isClaimed ? "text-green-600" : "text-orange-500"
						}`}
				>
					{item.amount}
				</Text>
			</View>

			{/* Email */}
			<Text
				className="text-gray-700 text-sm"
				numberOfLines={1}
				ellipsizeMode="tail"
			>
				{item.email}
			</Text>

			{/* Status */}
			<View className="mt-2">
				<Text
					className={`text-xs font-medium ${isClaimed ? "text-green-500" : "text-yellow-600"
						}`}
				>
					{isClaimed ? "✅ Claimed" : "⏳ Pending"}
				</Text>
			</View>
		</View>
	);
}

/**
 * Helper to format ISO time into a short readable date/time
 */
function formatDate(isoString: string): string {
	try {
		const date = new Date(isoString);
		return date.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}
