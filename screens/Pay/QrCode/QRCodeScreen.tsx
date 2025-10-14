import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QrTabSwitch from "./QrTabSwitch";
import CameraPermissionView from "./CameraPermissionView";
import UploadPhotoButton from "./UploadPhotoButton";
import NavigationBar from "components/NavigationBar";

export default function QRCodeScreen() {
	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="mx-4">
				<NavigationBar title="QR Code" />
			</View>

			<View className="mt-6 px-6">
				<QrTabSwitch />
			</View>

			<View className="flex-[0.5]" />

			<View className="mt-16 px-6">
				<CameraPermissionView />
			</View>

			<View className="flex-1" />

			<View className="pb-10 items-center">
				<UploadPhotoButton />
			</View>
		</SafeAreaView>
	);
}
