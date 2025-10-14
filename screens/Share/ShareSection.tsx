import { View, Text } from "react-native";
import IconButton from "components/IconButton";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import XTwitterIcon from "assets/XTwitterIcon";

export default function ShareSection() {
	return (
		<View className="mt-10">
			<Text className="text-gray-600 text-lg mb-4 ml-4">Share On</Text>

			<View className="flex-row justify-between px-4">
				<IconButton
					label="Facebook"
					icon={<FontAwesome5 name="facebook-f" size={36} color="white" />}
				/>
				<IconButton
					label="Twitter"
					icon={<XTwitterIcon />}
				/>
				<IconButton
					label="Insta"
					icon={<FontAwesome5 name="instagram" size={42} color="white" />}
				/>
				<IconButton
					label="More"
					icon={<Ionicons name="add-circle-outline" size={42} color="white" />}
				/>
			</View>
		</View>
	);
}
