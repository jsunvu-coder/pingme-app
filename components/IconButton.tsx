import React from "react";
import {View, Text, ViewStyle, StyleProp, TouchableOpacity } from "react-native";

type IconButtonProps = {
	label?: string;
	icon: React.ReactNode; 
	backgroundColor?: string;
	size?: number; 
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
};

export default function IconButton({
	label,
	icon,
	backgroundColor = "#FD4912",
	size = 64,
	onPress,
	style,
}: IconButtonProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.85}
			style={style}
		>
			<View
				style={{
					backgroundColor,
					width: size,
					height: size,
					borderRadius: 16,
					justifyContent: 'center', 
					alignItems: 'center',
				}}
			>
				{icon}
			</View>

			{label ? (
				<Text className="mt-2 text-lg text-black text-center">{label}</Text>
			) : null}
		</TouchableOpacity>
	);
}
