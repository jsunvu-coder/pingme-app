import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EventLog } from "business/models/EventLog";

export const HistoryRow = ({ event }: { event: EventLog }) => {
	const date = new Date(event.timestamp * 1000);
	const time = date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	const isIncoming = event.direction === "received";
	const color = isIncoming ? "text-green-500" : "text-red-500";

	// 🧩 Convert action → readable label
	const typeLabel = getActionLabel(event.action);

	return (
		<View className="bg-white rounded-2xl px-5 py-6 mb-6 flex-row justify-between items-center">
			<View>
				<Text className="text-gray-400 text-md">{time}</Text>
				<View className="flex-row items-center mt-1">
					<Ionicons
						name={isIncoming ? "arrow-down" : "arrow-up"}
						size={18}
						color={isIncoming ? "#22C55E" : "#EF4444"}
					/>
					<Text className="ml-2 mt-2 text-gray-800 text-xl font-medium">
						{typeLabel}
					</Text>
				</View>
			</View>

			<Text className={`text-2xl font-semibold ${color}`}>
				{isIncoming ? "+" : "-"}
				${event.amountNumber?.toFixed(2) || "0.00"}
			</Text>
		</View>
	);
};

// -----------------------------------------------------------------------------
// Helper to interpret event.action
// (Update mapping to fit your EventLog action codes)
// -----------------------------------------------------------------------------
function getActionLabel(action: number): string {
	switch (action) {
		case 0:
			return "Payment";
		case 1:
			return "Deposit";
		case 2:
			return "Withdrawal";
		case 3:
			return "Claim";
		case 4:
			return "Lockbox Created";
		case 5:
			return "Lockbox Updated";
		case 6:
			return "Lockbox Deleted";
		case 7:
			return "Top-Up";
		case 8:
			return "Balance Sync";
		case 9:
			return "Send Payment";
		default:
			return "Other";
	}
}
