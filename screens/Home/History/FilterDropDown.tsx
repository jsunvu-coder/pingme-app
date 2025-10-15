import { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WalletAddIcon from "assets/WalletAddIcon";

type Option = {
	label: string;
	value: "all" | "send" | "receive";
};

type Props = {
	value: "all" | "send" | "receive";
	onChange: (val: "all" | "send" | "receive") => void;
	options?: Option[];
};

export default function FilterDropdown({
	value,
	onChange,
	options = [
		{ label: "Show All", value: "all" },
		{ label: "Sent", value: "send" },
		{ label: "Received", value: "receive" },
	],
}: Props) {
	const [expanded, setExpanded] = useState(false);
	const animation = useRef(new Animated.Value(0)).current;

	const toggleExpand = () => {
		const next = !expanded;
		setExpanded(next);

		Animated.timing(animation, {
			toValue: next ? 1 : 0,
			duration: 250,
			easing: Easing.out(Easing.quad),
			useNativeDriver: false,
		}).start();
	};

	const height = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [0, options.length * 52 + 8], // smooth expand height
	});

	const handleSelect = (val: "all" | "send" | "receive") => {
		onChange(val);
		toggleExpand();
	};

	const getIcon = (val: string) => {
		switch (val) {
			case "send":
				return <Ionicons name="remove-outline" size={20} color="#FD4912" />;
			case "receive":
				return <Ionicons name="add-outline" size={20} color="#FD4912" />;
			default:
				return <WalletAddIcon size={20} color="#FD4912" />;
		}
	};

	const currentLabel =
		options.find((opt) => opt.value === value)?.label || "Show All";

	return (
		<View className="mt-6">
			{/* Header / Selector */}
			<TouchableOpacity
				onPress={toggleExpand}
				activeOpacity={0.8}
				className="border border-[#FD4912] rounded-2xl flex-row justify-between items-center px-4 py-3 bg-white"
			>
				<Text className="text-base text-gray-800 font-medium">
					{currentLabel}
				</Text>
				<Ionicons
					name={expanded ? "chevron-up" : "chevron-down"}
					size={18}
					color="#FD4912"
				/>
			</TouchableOpacity>

			{/* Animated dropdown */}
			<Animated.View
				style={{
					overflow: "hidden",
					height,
					opacity: animation,
				}}
				className="bg-white rounded-2xl mt-2 border border-gray-100 shadow-sm"
			>
				{options.map((opt, idx) => {
					const isSelected = value === opt.value;
					const isFirst = idx === 0;
					return (
						<TouchableOpacity
							key={opt.value}
							onPress={() => handleSelect(opt.value)}
							activeOpacity={0.7}
							className={`flex-row items-center px-4 py-3 ${isSelected ? "bg-[#FFF6F3]" : "bg-white"
								} ${!isFirst ? "border-t border-gray-100" : ""}`}
						>
							{getIcon(opt.value)}
							<Text
								className={`text-base font-medium ml-2 ${isSelected ? "text-[#FD4912]" : "text-gray-800"
									}`}
							>
								{opt.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</Animated.View>
		</View>
	);
}
