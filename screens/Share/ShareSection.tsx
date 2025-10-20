import { View, Text, Share, Linking, Alert } from "react-native";
import IconButton from "components/IconButton";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import XTwitterIcon from "assets/XTwitterIcon";
import { useCallback, useMemo } from "react";
import { useRoute } from "@react-navigation/native";
import { APP_URL } from "business/Config";
import * as Clipboard from "expo-clipboard";

type ShareParams = {
	amount?: number;
	duration?: number;
	mode?: "claimed" | "sent";
	amountUsdStr?: string;
	from?: "login" | "signup";
};

export default function ShareSection() {
	const route = useRoute();
	const { amount = 100, duration = 2, mode, amountUsdStr } =
		(route.params as ShareParams) || {};

	const formattedAmount = useMemo(
		() => amountUsdStr ?? amount.toFixed(2),
		[amount, amountUsdStr],
	);

	const shareText = useMemo(() => {
		const action = mode === "claimed" ? "claimed" : "sent";
		const durationText = duration ? `${duration} sec` : "seconds";
		return `Just ${action} $${formattedAmount} in ${durationText} with @PingMe! #JustPinged`;
	}, [formattedAmount, mode, duration]);

	const shareContent = useMemo(
		() => `${shareText}\n${APP_URL}`,
		[shareText],
	);

	const handleSystemShare = useCallback(async () => {
		try {
			await Share.share({
				message: shareContent,
				url: APP_URL,
			});
		} catch (err) {
			console.error("Share error:", err);
		}
	}, [shareContent]);

	const tryOpenShareTarget = useCallback(async (url: string) => {
		let canOpen = false;
		try {
			canOpen = await Linking.canOpenURL(url);
		} catch (err) {
			console.error("Share canOpenURL error:", err);
		}

		if (canOpen) {
			try {
				await Linking.openURL(url);
				return true;
			} catch (err) {
				console.error("Share openURL error:", err);
				return false;
			}
		}

		try {
			await Linking.openURL(url);
			return true;
		} catch (err) {
			console.error("Share openURL direct error:", err);
			return false;
		}
	}, []);

	const handleFacebookShare = useCallback(async () => {
		const appUrl = `fb://sharer?u=${encodeURIComponent(APP_URL)}`;
		const encodedUrl = encodeURIComponent(APP_URL);
		const encodedQuote = encodeURIComponent(shareText);
		const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedQuote}`;
		const openedApp = await tryOpenShareTarget(appUrl);
		const opened = openedApp || (await tryOpenShareTarget(shareUrl));
		if (!opened) {
			await handleSystemShare();
		}
	}, [handleSystemShare, shareText, tryOpenShareTarget]);

	const handleTwitterShare = useCallback(async () => {
		const appUrl = `twitter://post?message=${encodeURIComponent(shareText)}`;
		const xAppUrl = `x-com.twitter.android://post?message=${encodeURIComponent(shareText)}`;
		const encodedUrl = encodeURIComponent(APP_URL);
		const encodedText = encodeURIComponent(shareText);
		const shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
		const openedApp =
			(await tryOpenShareTarget(appUrl)) ||
			(await tryOpenShareTarget(xAppUrl));
		const opened = openedApp || (await tryOpenShareTarget(shareUrl));
		if (!opened) {
			await handleSystemShare();
		}
	}, [handleSystemShare, shareText, tryOpenShareTarget]);

	const handleInstagramShare = useCallback(async () => {
		try {
			await Clipboard.setStringAsync(shareContent);
		} catch (err) {
			console.error("Clipboard error:", err);
		}

		const openedStory = await tryOpenShareTarget("instagram-stories://share");
		if (openedStory) {
			return;
		}

		const openedApp = await tryOpenShareTarget("instagram://app");
		if (openedApp) {
			return;
		}

		Alert.alert(
			"Instagram unavailable",
			"Share text copied to clipboard. Paste it manually in Instagram.",
		);

		const openedWeb = await tryOpenShareTarget("https://www.instagram.com/");
		if (openedWeb) {
			return;
		}

		await handleSystemShare();
	}, [handleSystemShare, shareContent, tryOpenShareTarget]);

	const handleMoreShare = useCallback(() => {
		void handleSystemShare();
	}, [handleSystemShare]);

	return (
		<View className="mt-10">
			<Text className="text-gray-600 text-lg mb-4 ml-4">Share On</Text>

			<View className="flex-row justify-between px-4">
				<IconButton
					label="Facebook"
					icon={<FontAwesome5 name="facebook-f" size={36} color="white" />}
					onPress={handleFacebookShare}
				/>
				<IconButton
					label="Twitter"
					icon={<XTwitterIcon />}
					onPress={handleTwitterShare}
				/>
				<IconButton
					label="Insta"
					icon={<FontAwesome5 name="instagram" size={42} color="white" />}
					onPress={handleInstagramShare}
				/>
				<IconButton
					label="More"
					icon={<Ionicons name="add-circle-outline" size={42} color="white" />}
					onPress={handleMoreShare}
				/>
			</View>
		</View>
	);
}
