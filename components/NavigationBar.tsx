import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { goBack } from 'navigation/Navigation';
import BackIcon from 'assets/BackIcon';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NavigationBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} />
      <View className="flex-row items-center justify-between py-4">
        <View className="w-16 items-center">
          <BackIcon onPress={handleBack} />
        </View>

        <Text className="flex-1 text-center text-xl font-semibold text-gray-800">{title}</Text>

        {/* Placeholder for balancing layout (same width as BackIcon) */}
        <View className="w-16" />
      </View>
    </>
  );
}
