import { ScrollView, View } from "react-native";
import HeaderView from "components/HeaderView";
import AccountTierView from "./AccountTierView";
import AccountInfoCard from "./AccountInfoCard";
import AccountActionList from "./AccountActionList";
import { AccountDataService } from "business/services/AccountDataService";
import { BalanceService } from "business/services/BalanceService";
import { SafeAreaView } from "react-native-safe-area-context";
import { setRootScreen } from "navigation/Navigation";

export default function AccountScreen() {
	return (
		<View className="flex-1 bg-[#FAFAFA]">
			<SafeAreaView edges={['top']} />
			
			<HeaderView title="Account" variant="light" />

			<ScrollView className="m-6">
				<AccountTierView
					pointsToNextTier={80}
					currentTier="BRONZE"
					onHowToEarn={() => console.log("Go to HowToEarn")}
				/>

				<AccountInfoCard
					email={AccountDataService.getInstance().email || ""}
					balance={`$${BalanceService.getInstance().totalBalance || "$0.00"}`}
				/>

				<AccountActionList
					onLogout={() => setRootScreen(["SplashScreen"])}
				/>
			</ScrollView>
		</View>
	);
}
