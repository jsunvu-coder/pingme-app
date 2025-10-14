import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";

type Props = {
  saved: boolean;
  onToggle: (value: boolean) => void;
};

export default function SaveConfirmation({ saved, onToggle }: Props) {
  const scale = useRef(new Animated.Value(saved ? 1 : 0)).current;

  const toggle = () => {
    const newValue = !saved;
    Animated.spring(scale, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
    }).start();
    onToggle(newValue);
  };

  return (
    <TouchableOpacity
      className="flex-row items-center mt-6"
      activeOpacity={0.8}
      onPress={toggle}
    >
      {/* Custom checkbox */}
      <View
        className={`w-6 h-6 rounded-md border-2 ${
          saved ? "border-[#FD4912] bg-[#FD4912]" : "border-gray-400"
        } items-center justify-center`}
      >
        <Animated.View
          style={{
            transform: [{ scale }],
            opacity: scale,
          }}
        >
          <Ionicons name="checkmark" size={16} color="white" />
        </Animated.View>
      </View>

      {/* Label */}
      <Text className="ml-3 text-[#FD4912] text-xl">
        I have securely saved my QR code
      </Text>
    </TouchableOpacity>
  );
}
