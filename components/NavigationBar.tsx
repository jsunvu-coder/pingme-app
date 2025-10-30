import { View, Text, TouchableOpacity } from 'react-native';
import { goBack } from 'navigation/Navigation';
import BackIcon from 'assets/BackIcon';

export default function NavigationBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };
  return (
    <View className="flex-row items-center justify-between">
      <View className="w-16 items-center">
        <BackIcon onPress={handleBack} />
      </View>

      <Text className="flex-1 text-center text-2xl font-semibold text-gray-800">{title}</Text>

      {/* Placeholder for balancing layout (same width as BackIcon) */}
      <View className="w-10" />
    </View>
  );
}
