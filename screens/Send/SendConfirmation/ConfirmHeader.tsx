import { View, Text, TouchableOpacity } from "react-native";

export default function ConfirmHeader({ onClose }: { onClose?: () => void }) {
  return (
    <View className="flex-row justify-end mb-4">
      <TouchableOpacity onPress={onClose}>
        <Text className="text-2xl text-gray-400">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
