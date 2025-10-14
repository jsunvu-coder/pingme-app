import { ScrollView, View } from "react-native";
import TopUpHeader from "./DepositHeader";
import DepositAddressCard from "./DepositAddressCard";
import InfoNote from "./InfoNoteView";
import NavigationBar from "components/NavigationBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountDataService } from "business/services/AccountDataService";
import { useEffect, useState } from "react";

export default function DepositScreen() {
	const [forwarder, setForwarder] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadForwarder = async () => {
			try {
				setLoading(true);
				const accountData = AccountDataService.getInstance();

				const fwd = await accountData.getForwarder();
				if (mounted) {
					setForwarder(fwd);
					setError(null);
				}
			} catch (err) {
				console.error("❌ Failed to load forwarder:", err);
				if (mounted) setError("Failed to retrieve deposit address");
			} finally {
				if (mounted) setLoading(false);
			}
		};

		loadForwarder();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<SafeAreaView className="flex-1 bg-[#fafafa] px-4 pt-4">
			<NavigationBar title="Top Up Balance" />

			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-1 px-6 py-4">
					<TopUpHeader />
					<DepositAddressCard address={forwarder || ""} />
					<InfoNote />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
