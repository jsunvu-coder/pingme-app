import { useState } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";

import QrTabSwitch from "./QrTabSwitch";
import NavigationBar from "components/NavigationBar";
import ScanQRView from "./ScanQRView";
import MyQRCodeView from "./MyQrCodeScreen";
import { AccountDataService } from "business/services/AccountDataService";

type QRMode = "scan" | "myqr";

export default function QRCodeScreen() {
	const route = useRoute();
	const { mode = "scan" } = (route.params as { mode?: QRMode }) || {};
	const [activeTab, setActiveTab] = useState<QRMode>(mode);

	return (
		<View className="flex-1 bg-white">
			<SafeAreaView edges={['top']} />

			<View className="mx-4">
				<NavigationBar title="QR Code" />
			</View>

			{/* Tabs */}
			<View className="mt-6 px-6">
				<QrTabSwitch activeTab={activeTab} setActiveTab={setActiveTab} />
			</View>

			{/* Main Content */}
			{activeTab === "scan" && <ScanQRView/>}

			{activeTab === "myqr" && <MyQRCodeView value={AccountDataService.getInstance().email || ""} />}
		</View>
	);
}
