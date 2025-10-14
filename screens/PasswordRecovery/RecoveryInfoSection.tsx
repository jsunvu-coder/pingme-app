import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RecoveryInfoSection() {
  const points = [
    "It serves as the master key to your PingMe account.",
    "Please store it securely (download, print, or save in an encrypted password manager).",
    "If you forget your password, scanning this QR code in the Forgot Password process will reveal your current password.",
    "For your protection, once you confirm that the QR code has been saved, it will be permanently hidden.",
    "This function cannot be accessed again.",
  ];

  return (
    <View className="mt-6">
      <View className="flex-row items-start space-x-2 mr-4">
        <Ionicons name="information-circle" size={24} color="#FD4912" className="mr-2"/>
        <Text className="text-[#FD4912] font-semibold text-lg mr-4">
          This QR code is your one-time recovery credential.
        </Text>
      </View>

      {/* Bullet list */}
      <View className="mt-2 pl-2">
        {points.map((text, idx) => (
          <View key={idx} className="flex-row items-start mb-2">
            <Text className="text-[#FD4912] mr-2 text-4xl">•</Text>
            <Text className="flex-1 text-gray-300 text-lg leading-6 mt-[6px]">
              {text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
