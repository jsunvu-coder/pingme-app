import { View, Text, TouchableOpacity } from "react-native";
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { goBack } from "navigation/Navigation";
import BackIcon from "assets/BackIcon";

export default function NavigationBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack()
    }
  };
  return (
    <View className="flex-row items-center justify-between">
				<View className="w-10">
					<BackIcon onPress={handleBack} />
				</View>

				<Text className="text-2xl font-semibold text-gray-800 flex-1 text-center">
					{title}
				</Text>

				{/* Placeholder for balancing layout (same width as BackIcon) */}
				<View className="w-10" />
			</View>
  );
}
