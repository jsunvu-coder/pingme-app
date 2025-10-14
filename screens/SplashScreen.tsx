import { useEffect } from "react";
import { View } from "react-native";
import LogoWithText from "assets/LogoWithText";
import { setRootScreen } from "navigation/Navigation";

export default function SplashScreen() {
	useEffect(() => {
		const timer = setTimeout(() => {
			setRootScreen(["OnboardingPager"]);
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<View className="flex-1 items-center justify-center bg-[#FD4912]">
			<LogoWithText />
		</View>
	);
}
