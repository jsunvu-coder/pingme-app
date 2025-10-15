import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import * as Application from "expo-application";

const version = Application.nativeApplicationVersion ?? "";
const build = Application.nativeBuildVersion ?? "";


type ItemProps = {
	label: string;
	action: () => void;
	rightView?: React.ReactNode;
};

type Props = {
	onLogout: () => void;
};

export default function AccountActionList({ onLogout }: Props) {
	const items: ItemProps[] = [
		{
			label: "Password Recovery",
			action: () => {},
			rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
		},
		// {
		// 	label: "Change Password",
		// 	action: () => {},
		// 	rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
		// },
		// {
		// 	label: "Rate us on App Store",
		// 	action: () => {},
		// 	rightView: <Ionicons name="chevron-forward" size={20} color="#FD4912" />,
		// },
		{
			label: "About PingMe",
			action: () => {},
			rightView: <Text className="text-gray-400 text-lg">v{version} ({build})</Text>,
		},
	];

	return (
		<View className="mt-6 rounded-2xl overflow-hidden">
			{items.map((item, index) => (
				<Item key={index} {...item} />
			))}

			{/* Spacer */}
			<View className="h-6" />

			<Item
				label="Log out"
				action={onLogout}
				rightView={<Ionicons name="log-out-outline" size={22} color="#FD4912" />}
			/>
		</View>
	);
}

const Item = ({ label, action, rightView }: ItemProps) => {
	return (
		<TouchableOpacity
			onPress={action}
			activeOpacity={0.7}
			className="flex-row justify-between items-center p-6 mt-3 bg-white rounded-2xl"
		>
			<Text className="text-black text-lg">{label}</Text>
			{rightView ?? (
				<Ionicons name="chevron-forward" size={20} color="#FD4912" />
			)}
		</TouchableOpacity>
	);
};
