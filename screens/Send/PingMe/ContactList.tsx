import * as Contacts from "expo-contacts";
import { useEffect, useState } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	ActivityIndicator,
	Alert,
	Platform,
	Linking,
} from "react-native";
import CloseButton from "components/CloseButton";

type ContactPickerModalProps = {
	visible: boolean;
	onClose: () => void;
	onSelect: (email: string) => void;
};

export default function ContactPickerModal({
	visible,
	onClose,
	onSelect,
}: ContactPickerModalProps) {
	const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!visible) return;

		(async () => {
			setLoading(true);
			try {
				const { status } = await Contacts.requestPermissionsAsync();

				if (status !== "granted") {
					Alert.alert(
						"Permission Needed",
						Platform.OS === "ios"
							? "PingMe needs access to your contacts to select an email recipient.\n\nYou can enable Contacts access in:\nSettings → Privacy → Contacts → PingMe"
							: "PingMe needs access to your contacts to select an email recipient.\n\nYou can enable Contacts permission in:\nSettings → Apps → PingMe → Permissions → Contacts",
						[
							{ text: "Cancel", style: "cancel" },
							{
								text: "Open Settings",
								onPress: () => {
									if (Platform.OS === "ios") Linking.openURL("app-settings:");
									else Linking.openSettings();
								},
							},
						]
					);
					return;
				}

				const { data } = await Contacts.getContactsAsync({
					fields: [Contacts.Fields.Emails],
				});

				const emailContacts = data.filter(
					(c) => c.emails && c.emails.length > 0
				);
				setContacts(emailContacts);
			} catch (err) {
				console.error("❌ Failed to fetch contacts:", err);
				Alert.alert("Error", "Could not load contacts. Please try again.");
			} finally {
				setLoading(false);
			}
		})();
	}, [visible]);

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View className="flex-1 bg-[#FAFAFA] rounded-t-[24px] overflow-hidden">
				{/* Header */}
				<View className="flex-row items-center justify-between px-6 pt-10 pb-4 border-b border-gray-200 bg-white">
					<Text className="text-2xl font-bold text-black">Select Contact</Text>
					<CloseButton onPress={onClose} />
				</View>

				{/* Content */}
				{loading ? (
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color="#FD4912" />
						<Text className="mt-4 text-gray-500 text-base">
							Loading contacts...
						</Text>
					</View>
				) : contacts.length === 0 ? (
					<View className="flex-1 items-center justify-center">
						<Text className="text-gray-500 text-lg font-medium">
							No contacts with emails found
						</Text>
					</View>
				) : (
					<FlatList
						data={contacts}
						keyExtractor={(item, index) => item.id || index.toString()}
						renderItem={({ item }) => {
							const email = item.emails?.[0]?.email;
							return (
								<TouchableOpacity
									className="bg-white mx-6 mb-3 p-4 rounded-2xl border border-gray-100 flex-row items-center"
									activeOpacity={0.8}
									onPress={() => {
										if (email) onSelect(email);
										onClose();
									}}
								>
									<View className="flex-1">
										<Text className="text-lg font-semibold text-black">
											{item.name}
										</Text>
										{email && (
											<Text className="text-gray-500 mt-1">{email}</Text>
										)}
									</View>
									<Text className="text-[#FD4912] text-sm font-semibold">
										Select
									</Text>
								</TouchableOpacity>
							);
						}}
						contentContainerStyle={{ paddingVertical: 16 }}
					/>
				)}
			</View>
		</Modal>
	);
}
