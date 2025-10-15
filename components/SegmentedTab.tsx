import { TouchableOpacity, Text, View } from "react-native";

type Props = {
	label: string;
	icon: React.ReactNode;
	isActive: boolean;
	onPress: () => void;
};

export default function SegmentedTab({ label, icon, isActive, onPress }: Props) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			className={`flex-1 flex-row items-center justify-center rounded-full h-14 ${
				isActive ? "" : ""
			}`}
		>
			<View>{icon}</View>
			<Text
				className={`ml-2 text-xl ${
					isActive
						? "text-white font-bold"
						: "text-[#444444] font-normal"
				}`}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}
