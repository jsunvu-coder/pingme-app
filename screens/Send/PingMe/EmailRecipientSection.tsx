import { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import EmailIcon from "assets/EmailIcon";
import AuthInput from "components/AuthInput";
import RecentList from "./RecentList";
import ContactIcon from "assets/ContactIcon";
import { RecentEmailStorage } from "./RecentEmailStorage";

export default function EmailRecipientSection({
	email,
	setEmail,
	onPressContactList,
}: {
	email: string;
	setEmail: (text: string) => void;
	onPressContactList?: () => void;
}) {
	const [recentEmails, setRecentEmails] = useState<string[]>([]);


	useFocusEffect(
		useCallback(() => {
			(async () => {
				const loaded = await RecentEmailStorage.load();
				setRecentEmails(loaded);
			})();
		}, [])
	);


	return (
		<View className="mt-8">
			{/* Header Row */}
			<View className="flex-row justify-between items-center mb-2">
				<View className="flex-row items-center">
					<EmailIcon />
				</View>

				<TouchableOpacity
					onPress={onPressContactList}
					className="flex-row items-center"
					activeOpacity={0.8}
				>
					<Text className="text-[#FD4912] font-medium mr-1">Contact List</Text>
					<ContactIcon />
				</TouchableOpacity>
			</View>

			{/* Email Input */}
			<AuthInput
				icon={<View />}
				value={email}
				onChangeText={setEmail}
				placeholder="Email address"
			/>

			{/* Recent Emails */}
			{recentEmails.length > 0 && (
				<RecentList
					title="Recently Sent"
					items={recentEmails}
					onSelect={(selected) => setEmail(selected)} // ✅ tap chip to autofill
				/>
			)}
		</View>
	);
}
