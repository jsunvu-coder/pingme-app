import {
	ScrollView,
	View,
	Text,
	TouchableOpacity,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useCallback } from "react";
import { EventLog } from "business/models/EventLog";
import { goBack } from "navigation/Navigation";
import { AccountDataService } from "business/services/AccountDataService";
import { HistoryRow } from "./HistoryRow";
import FilterDropdown from "./FilterDropDown";

export default function PingHistoryScreen() {
	const [events, setEvents] = useState<EventLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filterType, setFilterType] = useState<"all" | "send" | "receive">("all");

	const accountData = AccountDataService.getInstance();

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		try {
			await accountData.refreshData();
			const records = accountData.getRecords();
			setEvents(records || []);
		} catch (err) {
			console.error("❌ Failed to load ping history:", err);
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	}, []);

	/** 🔍 Apply filter before grouping */
	const filteredEvents =
		filterType === "all"
			? events
			: events.filter((e) => {
				if (!e.direction) return false;
				if (filterType === "send") return e.direction === "sent";
				if (filterType === "receive") return e.direction === "received";
				return true;
			});

	const groupedEvents = groupByDate(filteredEvents);

	return (
		<SafeAreaView className="flex-1 bg-[#FAFAFA]">
			<Header />

			<ScrollView
				className="px-6"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				contentContainerStyle={{ paddingBottom: 80 }}
			>
				<View className="my-4">
					<FilterDropdown
						value={filterType}
						onChange={setFilterType}
						options={[
							{ label: "All", value: "all" },
							{ label: "Sent", value: "send" },
							{ label: "Received", value: "receive" },
						]}
					/>
				</View>

				{loading ? (
					<Text className="text-gray-500 text-center mt-20">
						Loading history...
					</Text>
				) : filteredEvents.length === 0 ? (
					<Text className="text-gray-400 text-center mt-20">
						No {filterType !== "all" ? filterType : ""} ping history found.
					</Text>
				) : (
					Object.entries(groupedEvents).map(([date, dayEvents]) => {
						const label = typeof date === "string" ? date.toUpperCase() : "";
						return (
							<View key={label} className="mb-6">
								<Text className="text-gray-400 font-medium mb-3">{label}</Text>

								{Array.isArray(dayEvents) &&
									dayEvents.map((event, index) => (
										<HistoryRow key={`${label}-${index}`} event={event} />
									))}
							</View>
						);
					})
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

/* ---------- Header ---------- */
const Header = () => (
	<View className="flex-row items-center justify-between px-6 pt-4">
		<TouchableOpacity onPress={goBack} activeOpacity={0.7}>
			<Ionicons name="chevron-back" size={28} color="#FD4912" />
		</TouchableOpacity>
		<Text className="text-2xl font-semibold text-black">Ping History</Text>
		<View className="w-8" />
	</View>
);

/* ---------- Group Helper ---------- */
function groupByDate(events: EventLog[]): Record<string, EventLog[]> {
	return events.reduce<Record<string, EventLog[]>>((acc, event) => {
		const timestamp = Number(event.timestamp) * 1000;
		if (!timestamp || isNaN(timestamp)) return acc;

		const label = new Date(timestamp).toLocaleDateString("en-US", {
			weekday: "short",
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

		if (!acc[label]) acc[label] = [];
		acc[label].push(event);
		return acc;
	}, {});
}
