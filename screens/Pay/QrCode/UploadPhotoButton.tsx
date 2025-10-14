import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function UploadPhotoButton() {
	return (
		<TouchableOpacity
			activeOpacity={0.8}
			className="flex-row items-center justify-center mt-6"
		>
			<Ionicons name="image-outline" size={18} color="#FD4912" />
			<Text className="text-[#FD4912] font-medium ml-2">Upload Photo</Text>
		</TouchableOpacity>
	);
}
